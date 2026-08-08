package com.ttstore.backend.controller;

import com.ttstore.backend.model.Usuario;
import com.ttstore.backend.repository.UsuarioRepository;
import com.ttstore.backend.security.JwtUtil;
import com.ttstore.backend.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;
    private final AuditService auditService;

    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil,
                          UsuarioRepository usuarioRepository, AuditService auditService,
                          PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.usuarioRepository = usuarioRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
    }

    // ── Endpoint de emergência: reseta senha do admin para admin123 ──
    @GetMapping("/reset-admin")
    public ResponseEntity<?> resetAdmin() {
        return usuarioRepository.findByLogin("admin").map(u -> {
            u.setSenha(passwordEncoder.encode("admin123"));
            usuarioRepository.save(u);
            return ResponseEntity.ok(Map.of(
                "ok", true,
                "mensagem", "Senha do admin resetada para: admin123"
            ));
        }).orElseGet(() -> {
            Usuario admin = new Usuario("admin", passwordEncoder.encode("admin123"), "ADMIN");
            usuarioRepository.save(admin);
            return ResponseEntity.ok(Map.of(
                "ok", true,
                "mensagem", "Admin criado com senha: admin123"
            ));
        });
    }

    // ── Endpoint de diagnóstico: lista usuários cadastrados ──
    @GetMapping("/usuarios")
    public ResponseEntity<?> listarUsuarios() {
        List<Map<String, Object>> lista = usuarioRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("login", u.getLogin());
            m.put("role", u.getRole());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(lista);
    }

    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@RequestBody Map<String, String> credentials, HttpServletRequest request) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            String jwt = jwtUtil.generateToken(userDetails);

            String permissoes = usuarioRepository.findByLogin(userDetails.getUsername())
                    .map(u -> u.getPermissoes() != null
                            ? u.getPermissoes()
                            : UsuarioController.permissoesPadrao(u.getRole()))
                    .orElse("{}");

            String role = auth.getAuthorities().stream().findFirst().map(Object::toString).orElse("USER");
            auditService.registrar(userDetails.getUsername(), role, "LOGIN", "Autenticação", "Usuário realizou login no sistema", request.getRemoteAddr());

            Map<String, Object> resp = new HashMap<>();
            resp.put("token", jwt);
            resp.put("username", userDetails.getUsername());
            resp.put("permissoes", permissoes);
            return ResponseEntity.ok(resp);

        } catch (BadCredentialsException e) {
            auditService.registrar(username, "GUEST", "ACESSO", "Autenticação", "Tentativa de login frustrada (senha incorreta)", request.getRemoteAddr());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Usuário ou senha incorretos"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erro ao fazer login: " + e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        String username = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            try {
                username = jwtUtil.extractUsername(jwt);
            } catch (Exception ignored) {}
        }
        if (username == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                username = auth.getName();
            }
        }
        if (username == null) {
            return ResponseEntity.ok(Map.of("status", "UP", "message", "Servidor ativo"));
        }

        final String finalUsername = username;
        return usuarioRepository.findByLogin(finalUsername).map(u -> {
            String permissoes = u.getPermissoes() != null ? u.getPermissoes() : UsuarioController.permissoesPadrao(u.getRole());
            Map<String, Object> resp = new HashMap<>();
            resp.put("username", u.getLogin());
            resp.put("role", u.getRole());
            resp.put("permissoes", permissoes);
            resp.put("status", "UP");
            return ResponseEntity.ok(resp);
        }).orElse(ResponseEntity.ok(Map.of("status", "UP", "username", username)));
    }
}
