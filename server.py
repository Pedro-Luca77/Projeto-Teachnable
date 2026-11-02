"""
HydraSense IA - Servidor Local para Acesso no Celular
"""
import os
import sys
import socket
import http.server
import socketserver

PORT = 8080

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def main():
    local_ip = get_local_ip()
    url = f"http://{local_ip}:{PORT}"

    print("=" * 64)
    print("   💧 HydraSense IA - SERVIDOR INICIADO COM SUCESSO! 💧")
    print("=" * 64)
    print()
    print("📱 PARA ABRIR NO CELULAR:")
    print("   1. Certifique-se de que o celular está no MESMO Wi-Fi que o PC.")
    print("   2. No navegador do seu celular (Chrome, Safari, etc.), digite:")
    print()
    print(f"      👉  {url}  👈")
    print()
    print("💻 NO COMPUTADOR:")
    print(f"   Acesse: http://localhost:{PORT}")
    print()
    print("=" * 64)
    print("   Pressione Ctrl + C para encerrar o servidor a qualquer momento.")
    print("=" * 64)
    print()

    # Muda para o diretório deste script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    Handler = http.server.SimpleHTTPRequestHandler
    Handler.extensions_map.update({
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json'
    })

    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor finalizado com sucesso.")
            sys.exit(0)

if __name__ == "__main__":
    main()
