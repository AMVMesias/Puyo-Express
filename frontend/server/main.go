package main

import (
	"errors"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

const (
	listenAddress = ":8080"
	staticRoot    = "/srv/public"
	maxBodyBytes  = 1 << 20
)

func main() {
	target, err := url.Parse("http://backend:8080")
	if err != nil {
		log.Fatal(err)
	}

	proxy := &httputil.ReverseProxy{
		Rewrite: func(request *httputil.ProxyRequest) {
			request.SetURL(target)
			request.Out.Host = request.In.Host
			request.Out.Header.Del("Forwarded")
			request.Out.Header.Del("X-Forwarded-For")
			request.Out.Header.Set("X-Forwarded-For", remoteIP(request.In.RemoteAddr))
			request.Out.Header.Set("X-Forwarded-Proto", forwardedProto(request.In))
		},
		ModifyResponse: func(response *http.Response) error {
			response.Header.Del("Server")
			response.Header.Del("X-Powered-By")
			response.Header.Del("X-Content-Type-Options")
			response.Header.Del("X-Frame-Options")
			response.Header.Del("Referrer-Policy")
			response.Header.Del("Permissions-Policy")
			response.Header.Del("Content-Security-Policy")
			response.Header.Del("X-XSS-Protection")
			return nil
		},
		ErrorHandler: func(writer http.ResponseWriter, _ *http.Request, proxyError error) {
			log.Printf("upstream unavailable: %v", proxyError)
			writer.Header().Set("Content-Type", "application/json")
			writer.WriteHeader(http.StatusBadGateway)
			_, _ = writer.Write([]byte(`{"error":"Servicio temporalmente no disponible."}`))
		},
		Transport: &http.Transport{
			Proxy:                 http.ProxyFromEnvironment,
			DialContext:           (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
			ResponseHeaderTimeout: 30 * time.Second,
			IdleConnTimeout:       60 * time.Second,
			MaxIdleConns:          50,
		},
	}

	handler := securityHeaders(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if strings.HasPrefix(request.URL.Path, "/api/") {
			if request.ContentLength > maxBodyBytes {
				jsonError(writer, http.StatusRequestEntityTooLarge, "La solicitud supera el tamaño permitido.")
				return
			}
			request.Body = http.MaxBytesReader(writer, request.Body, maxBodyBytes)
			proxy.ServeHTTP(writer, request)
			return
		}
		serveSPA(writer, request)
	}))

	server := &http.Server{
		Addr:              listenAddress,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      35 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    16 << 10,
	}

	log.Printf("web gateway listening on %s", listenAddress)
	if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		headers := writer.Header()
		headers.Set("X-Content-Type-Options", "nosniff")
		headers.Set("X-Frame-Options", "DENY")
		headers.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		headers.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
		headers.Set("Content-Security-Policy",
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
				"img-src 'self' data: https://tile.openstreetmap.org; font-src 'self' https://fonts.gstatic.com; "+
				"connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
		headers.Del("Server")
		headers.Del("X-Powered-By")
		next.ServeHTTP(writer, request)
	})
}

func serveSPA(writer http.ResponseWriter, request *http.Request) {
	cleanPath := path.Clean("/" + request.URL.Path)
	relativePath := strings.TrimPrefix(cleanPath, "/")
	if relativePath == "" {
		relativePath = "index.html"
	}
	if !fs.ValidPath(relativePath) {
		http.NotFound(writer, request)
		return
	}

	filePath := filepath.Join(staticRoot, filepath.FromSlash(relativePath))
	if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
		setStaticCache(writer, relativePath)
		http.ServeFile(writer, request, filePath)
		return
	}

	writer.Header().Set("Cache-Control", "no-cache")
	http.ServeFile(writer, request, filepath.Join(staticRoot, "index.html"))
}

func setStaticCache(writer http.ResponseWriter, fileName string) {
	if strings.HasPrefix(fileName, "assets/") {
		writer.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		writer.Header().Set("Cache-Control", "no-cache")
	}
	if extension := filepath.Ext(fileName); extension != "" {
		if contentType := mime.TypeByExtension(extension); contentType != "" {
			writer.Header().Set("Content-Type", contentType)
		}
	}
}

func remoteIP(remoteAddress string) string {
	host, _, err := net.SplitHostPort(remoteAddress)
	if err == nil {
		return host
	}
	return remoteAddress
}

func forwardedProto(request *http.Request) string {
	if request.TLS != nil {
		return "https"
	}
	return "http"
}

func jsonError(writer http.ResponseWriter, status int, message string) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_, _ = writer.Write([]byte(`{"error":"` + message + `"}`))
}
