package com.ttstore.backend.service;

import com.ttstore.backend.model.AuditLog;
import com.ttstore.backend.repository.AuditLogRepository;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        try {
            if (repository.count() == 0) {
                registrar("Sistema", "SYSTEM", "INICIO", "Sistema", "Sistema TT Store & Barbearia iniciado e operacional", "127.0.0.1");
            }
        } catch (Exception ignored) {}
    }

    public String getCurrentUsername() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getName().equalsIgnoreCase("anonymousUser")) {
                return auth.getName();
            }
        } catch (Exception ignored) {}
        return "Sistema";
    }

    public AuditLog registrar(String usuario, String role, String acao, String modulo, String descricao, String ip) {
        AuditLog log = new AuditLog(usuario, role, acao, modulo, descricao, ip);
        return repository.save(log);
    }

    public AuditLog log(String acao, String modulo, String descricao, HttpServletRequest request) {
        String username = getCurrentUsername();
        String ip = (request != null) ? request.getRemoteAddr() : "127.0.0.1";
        return registrar(username, "USUARIO", acao, modulo, descricao, ip);
    }

    public List<AuditLog> listar(LocalDate inicio, LocalDate fim) {
        if (inicio != null && fim != null) {
            LocalDateTime start = inicio.atStartOfDay();
            LocalDateTime end = fim.atTime(LocalTime.MAX);
            return repository.findByDataHoraBetweenOrderByIdDesc(start, end);
        }
        return repository.findAllByOrderByIdDesc();
    }

    public Map<String, Object> resumoHoje() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);

        long totalHoje = repository.countByDataHoraBetween(start, end);
        long exclusoesHoje = repository.countByDataHoraBetweenAndAcao(start, end, "EXCLUSAO");
        long edicoesHoje = repository.countByDataHoraBetweenAndAcao(start, end, "EDICAO");
        long loginsHoje = repository.countByDataHoraBetweenAndAcao(start, end, "LOGIN");

        Map<String, Object> map = new HashMap<>();
        map.put("totalHoje", totalHoje);
        map.put("exclusoesHoje", exclusoesHoje);
        map.put("edicoesHoje", edicoesHoje);
        map.put("loginsHoje", loginsHoje);
        return map;
    }
}
