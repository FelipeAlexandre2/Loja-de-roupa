package com.ttstore.backend.controller;

import com.ttstore.backend.model.AuditLog;
import com.ttstore.backend.repository.AuditLogRepository;
import com.ttstore.backend.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auditoria")
@CrossOrigin(origins = "*")
public class AuditController {

    private final AuditService auditService;
    private final AuditLogRepository repository;

    public AuditController(AuditService auditService, AuditLogRepository repository) {
        this.auditService = auditService;
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLog>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        List<AuditLog> logs = auditService.listar(dataInicio, dataFim);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/resumo")
    public ResponseEntity<Map<String, Object>> resumo() {
        return ResponseEntity.ok(auditService.resumoHoje());
    }

    @PostMapping
    public ResponseEntity<AuditLog> registrarManual(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String usuario = body.getOrDefault("usuario", "Sistema");
        String role = body.getOrDefault("role", "USER");
        String acao = body.getOrDefault("acao", "ACESSO");
        String modulo = body.getOrDefault("modulo", "Geral");
        String descricao = body.getOrDefault("descricao", "");
        String ip = request.getRemoteAddr();

        AuditLog log = auditService.registrar(usuario, role, acao, modulo, descricao, ip);
        return ResponseEntity.ok(log);
    }

    @DeleteMapping("/limpar")
    public ResponseEntity<Map<String, Object>> limparAntigos(@RequestParam(defaultValue = "30") int dias, HttpServletRequest request) {
        LocalDateTime limite = LocalDateTime.now().minusDays(dias);
        long deletados = repository.deleteByDataHoraBefore(limite);
        auditService.log("EXCLUSAO", "Registro de Atividades", "Apagou " + deletados + " registros de atividades com mais de " + dias + " dias", request);
        return ResponseEntity.ok(Map.of("deletados", deletados));
    }
}
