package com.ttstore.backend.controller;

import com.ttstore.backend.model.Usuario;
import com.ttstore.backend.repository.UsuarioRepository;
import com.ttstore.backend.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UsuarioController(UsuarioRepository repository, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public static String permissoesPadrao(String role) {
        if ("ADMIN".equalsIgnoreCase(role)) {
            return "{\"inicio\":\"EDIT\",\"pdv\":\"EDIT\",\"caixa\":\"EDIT\",\"estoque\":\"EDIT\",\"barbearia\":\"EDIT\",\"fiado\":\"EDIT\",\"relatorio\":\"EDIT\",\"auditoria\":\"EDIT\",\"config\":\"EDIT\"}";
        }
        if ("CAIXA".equalsIgnoreCase(role)) {
            return "{\"inicio\":\"VIEW\",\"pdv\":\"EDIT\",\"caixa\":\"EDIT\",\"estoque\":\"VIEW\",\"barbearia\":\"NONE\",\"fiado\":\"EDIT\",\"relatorio\":\"NONE\",\"auditoria\":\"NONE\",\"config\":\"NONE\"}";
        }
        return "{\"inicio\":\"VIEW\",\"pdv\":\"EDIT\",\"caixa\":\"EDIT\",\"estoque\":\"EDIT\",\"barbearia\":\"EDIT\",\"fiado\":\"EDIT\",\"relatorio\":\"VIEW\",\"auditoria\":\"VIEW\",\"config\":\"NONE\"}";
    }

    @GetMapping
    public List<Map<String, Object>> listar() {
        return repository.findAll().stream().map(u -> {
            String perms = u.getPermissoes() != null ? u.getPermissoes() : permissoesPadrao(u.getRole());
            return Map.<String, Object>of(
                "id",         u.getId(),
                "login",      u.getLogin(),
                "role",       u.getRole(),
                "permissoes", perms
            );
        }).collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Map<String, String> dados, HttpServletRequest request) {
        String login = dados.get("login");
        String senha = dados.get("senha");
        String role  = dados.getOrDefault("role", "USER");

        if (login == null || login.isBlank() || senha == null || senha.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Login e senha são obrigatórios."));
        }
        if (senha.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "A senha deve ter pelo menos 6 caracteres."));
        }
        if (repository.findByLogin(login).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuário já existe."));
        }

        String permsJson = dados.get("permissoes");
        if (permsJson == null || permsJson.isBlank()) {
            permsJson = permissoesPadrao(role);
        }

        Usuario novo = new Usuario(login, passwordEncoder.encode(senha), role.toUpperCase());
        novo.setPermissoes(permsJson);
        repository.save(novo);

        auditService.log("CRIACAO", "Usuários", String.format("Criou novo usuário '%s' com permissão %s", login, role), request);

        return ResponseEntity.ok(Map.of("message", "Usuário criado com sucesso.", "login", login));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluir(@PathVariable Long id, HttpServletRequest request) {
        return repository.findById(id).map(u -> {
            if ("ADMIN".equals(u.getRole())) {
                long adminCount = repository.findAll().stream()
                    .filter(a -> "ADMIN".equals(a.getRole())).count();
                if (adminCount <= 1) {
                    return ResponseEntity.badRequest().body(
                        Map.<String, Object>of("error", "Não é possível excluir o único administrador do sistema.")
                    );
                }
            }
            repository.deleteById(id);
            auditService.log("EXCLUSAO", "Usuários", String.format("Excluiu o usuário '%s' (ID #%d)", u.getLogin(), id), request);
            return ResponseEntity.noContent().<Map<String, Object>>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/senha")
    public ResponseEntity<?> alterarSenha(@PathVariable Long id, @RequestBody Map<String, String> dados, HttpServletRequest request) {
        return repository.findById(id).map(u -> {
            String novaSenha = dados.get("senha");
            if (novaSenha == null || novaSenha.isBlank()) {
                novaSenha = dados.get("novaSenha");
            }
            if (novaSenha == null || novaSenha.isBlank()) {
                return ResponseEntity.badRequest().body(Map.<String, Object>of("error", "Senha inválida."));
            }
            if (novaSenha.length() < 6) {
                return ResponseEntity.badRequest().body(Map.<String, Object>of("error", "A senha deve ter pelo menos 6 caracteres."));
            }
            u.setSenha(passwordEncoder.encode(novaSenha));
            repository.save(u);
            auditService.log("EDICAO", "Usuários", String.format("Alterou a senha do usuário '%s'", u.getLogin()), request);
            return ResponseEntity.ok(Map.<String, Object>of("message", "Senha alterada com sucesso."));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<?> alterarRole(@PathVariable Long id, @RequestBody Map<String, String> dados, HttpServletRequest request) {
        String novoRole = dados.get("role");
        if (novoRole == null || novoRole.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "O campo 'role' é obrigatório."));
        }
        if (!novoRole.equalsIgnoreCase("ADMIN") && !novoRole.equalsIgnoreCase("USER") && !novoRole.equalsIgnoreCase("CAIXA")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Role inválido. Use ADMIN, USER ou CAIXA."));
        }
        return repository.findById(id).map(u -> {
            if ("ADMIN".equals(u.getRole()) && !"ADMIN".equalsIgnoreCase(novoRole)) {
                long adminCount = repository.findAll().stream()
                    .filter(a -> "ADMIN".equals(a.getRole())).count();
                if (adminCount <= 1) {
                    return ResponseEntity.badRequest().body(
                        Map.<String, Object>of("error", "Não é possível rebaixar o único administrador do sistema.")
                    );
                }
            }
            String antigo = u.getRole();
            u.setRole(novoRole.toUpperCase());
            repository.save(u);
            auditService.log("EDICAO", "Usuários", String.format("Alterou perfil de '%s' de %s para %s", u.getLogin(), antigo, novoRole.toUpperCase()), request);
            return ResponseEntity.ok(Map.<String, Object>of(
                "message", "Perfil alterado com sucesso.",
                "login", u.getLogin(),
                "role", u.getRole()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/permissoes")
    public ResponseEntity<?> alterarPermissoes(@PathVariable Long id, @RequestBody Map<String, String> dados, HttpServletRequest request) {
        String permsJson = dados.get("permissoes");
        if (permsJson == null || permsJson.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "O campo 'permissoes' é obrigatório."));
        }
        return repository.findById(id).map(u -> {
            u.setPermissoes(permsJson);
            repository.save(u);
            auditService.log("EDICAO", "Usuários", String.format("Atualizou permissões granulares do usuário '%s'", u.getLogin()), request);
            return ResponseEntity.ok(Map.<String, Object>of(
                "message", "Permissões atualizadas com sucesso.",
                "login", u.getLogin(),
                "permissoes", permsJson
            ));
        }).orElse(ResponseEntity.notFound().build());
    }
}
