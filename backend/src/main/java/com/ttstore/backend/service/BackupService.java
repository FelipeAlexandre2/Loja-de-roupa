package com.ttstore.backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.annotation.Schedules;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BackupService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;
    private final String backupDirPath = "C:/PROJETOS/loja-roupas/backups";

    public BackupService(JdbcTemplate jdbcTemplate, AuditService auditService) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @PostConstruct
    public void init() {
        File dir = new File(backupDirPath);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        try {
            fazerBackupAutomatico();
        } catch (Exception e) {
            System.err.println("Aviso: Backup na inicialização: " + e.getMessage());
        }
    }

    @Schedules({
        @Scheduled(cron = "0 0 23 * * *"),
        @Scheduled(fixedRate = 21600000) // a cada 6 horas
    })
    public void fazerBackupAutomatico() {
        try {
            criarBackup("AUTOMATICO");
        } catch (Exception e) {
            System.err.println("Erro ao realizar backup automático: " + e.getMessage());
        }
    }

    @Transactional
    public Map<String, Object> criarBackup(String origem) {
        File dir = new File(backupDirPath);
        if (!dir.exists()) dir.mkdirs();

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
        String filename = "backup_loja_" + timestamp + ".zip";
        File targetFile = new File(dir, filename);
        String fullPath = targetFile.getAbsolutePath().replace("\\", "/");

        boolean backupOk = false;

        // Estratégia 1: SCRIPT TO COMPRESSION ZIP
        try {
            jdbcTemplate.execute("SCRIPT TO '" + fullPath + "' COMPRESSION ZIP");
            backupOk = targetFile.exists() && targetFile.length() > 0;
        } catch (Exception e1) {
            System.err.println("Tentativa 1 (SCRIPT TO ZIP) falhou: " + e1.getMessage());
        }

        // Estratégia 2: BACKUP TO nativo H2
        if (!backupOk) {
            try {
                jdbcTemplate.execute("BACKUP TO '" + fullPath + "'");
                backupOk = targetFile.exists() && targetFile.length() > 0;
            } catch (Exception e2) {
                System.err.println("Tentativa 2 (BACKUP TO) falhou: " + e2.getMessage());
            }
        }

        // Estratégia 3: Cópia direta do arquivo de banco H2
        if (!backupOk) {
            try {
                String userHome = System.getProperty("user.home");
                File h2DbFile = new File(userHome + "/.ttstore/data/loja-db.mv.db");
                if (h2DbFile.exists()) {
                    File dbTarget = new File(dir, "backup_loja_" + timestamp + ".db");
                    java.nio.file.Files.copy(h2DbFile.toPath(), dbTarget.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    filename = dbTarget.getName();
                    targetFile = dbTarget;
                    backupOk = true;
                }
            } catch (Exception e3) {
                System.err.println("Tentativa 3 (Cópia direta) falhou: " + e3.getMessage());
            }
        }

        if (!backupOk) {
            throw new RuntimeException("Não foi possível criar o arquivo de backup no servidor.");
        }

        long sizeBytes = targetFile.length();
        double sizeMb = sizeBytes / (1024.0 * 1024.0);

        limparBackupsAntigos(dir);

        try {
            auditService.registrar("Sistema", "SYSTEM", "CRIACAO", "Configurações", "Criou backup " + origem.toLowerCase() + " do banco de dados (" + filename + ")", "127.0.0.1");
        } catch (Exception ignored) {}

        return Map.of(
            "nome", filename,
            "caminho", targetFile.getAbsolutePath(),
            "tamanhoBytes", sizeBytes,
            "tamanhoMb", String.format(Locale.US, "%.2f MB", sizeMb),
            "dataHora", LocalDateTime.now().toString(),
            "origem", origem
        );
    }

    public List<Map<String, Object>> listarBackups() {
        File dir = new File(backupDirPath);
        if (!dir.exists()) return Collections.emptyList();

        File[] files = dir.listFiles((d, name) -> name.endsWith(".zip") || name.endsWith(".sql") || name.endsWith(".db"));
        if (files == null) return Collections.emptyList();

        return Arrays.stream(files)
            .sorted((f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()))
            .map(f -> {
                Map<String, Object> map = new HashMap<>();
                map.put("nome", f.getName());
                map.put("tamanhoBytes", f.length());
                map.put("tamanhoFormatado", String.format(Locale.US, "%.2f MB", f.length() / (1024.0 * 1024.0)));
                map.put("dataModificacao", new Date(f.lastModified()).toString());
                return map;
            })
            .collect(Collectors.toList());
    }

    public File getBackupFile(String filename) {
        File file = new File(backupDirPath, filename);
        if (file.exists() && file.isFile()) {
            return file;
        }
        return null;
    }

    public boolean deletarBackup(String filename) {
        File file = new File(backupDirPath, filename);
        if (file.exists() && file.isFile()) {
            return file.delete();
        }
        return false;
    }

    private void limparBackupsAntigos(File dir) {
        File[] files = dir.listFiles((d, name) -> name.endsWith(".zip") || name.endsWith(".db") || name.endsWith(".sql"));
        if (files != null && files.length > 30) {
            Arrays.sort(files, Comparator.comparingLong(File::lastModified));
            for (int i = 0; i < files.length - 30; i++) {
                files[i].delete();
            }
        }
    }
}
