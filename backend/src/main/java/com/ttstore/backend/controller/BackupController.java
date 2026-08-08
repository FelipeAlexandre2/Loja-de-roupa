package com.ttstore.backend.controller;

import com.ttstore.backend.service.AuditService;
import com.ttstore.backend.service.BackupService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backups")
@CrossOrigin(origins = "*")
public class BackupController {

    private final BackupService backupService;
    private final AuditService auditService;

    public BackupController(BackupService backupService, AuditService auditService) {
        this.backupService = backupService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listar() {
        return ResponseEntity.ok(backupService.listarBackups());
    }

    @PostMapping("/criar")
    public ResponseEntity<?> criarManual(HttpServletRequest request) {
        try {
            Map<String, Object> result = backupService.criarBackup("MANUAL");
            auditService.log("CRIACAO", "Configurações", "Criou backup manual do banco de dados (" + result.get("nome") + ")", request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Erro interno no backup"));
        }
    }

    @GetMapping("/download/{filename}")
    public ResponseEntity<Resource> download(@PathVariable String filename, HttpServletRequest request) {
        File file = backupService.getBackupFile(filename);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        auditService.log("ACESSO", "Configurações", "Baixou arquivo de backup '" + filename + "'", request);
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{filename}")
    public ResponseEntity<Void> deletar(@PathVariable String filename, HttpServletRequest request) {
        if (backupService.deletarBackup(filename)) {
            auditService.log("EXCLUSAO", "Configurações", "Excluiu arquivo de backup '" + filename + "'", request);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
