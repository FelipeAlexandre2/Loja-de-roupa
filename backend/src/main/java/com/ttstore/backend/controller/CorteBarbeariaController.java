package com.ttstore.backend.controller;

import com.ttstore.backend.model.CorteBarbearia;
import com.ttstore.backend.service.AuditService;
import com.ttstore.backend.service.CorteBarbeariaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/barbearia")
@CrossOrigin(origins = "*")
public class CorteBarbeariaController {

    private final CorteBarbeariaService service;
    private final AuditService auditService;

    public CorteBarbeariaController(CorteBarbeariaService service, AuditService auditService) {
        this.service = service;
        this.auditService = auditService;
    }

    @GetMapping("/resumo")
    public Map<String, Object> resumoDoDia() {
        return service.buscarResumoDoDia();
    }

    @PostMapping
    public ResponseEntity<CorteBarbearia> registrarNovoCorte(@RequestBody CorteBarbearia corte, HttpServletRequest request) {
        CorteBarbearia salvo = service.registrarCorte(corte);
        auditService.log("CRIACAO", "Barbearia",
            String.format("Lançou corte do barbeiro %s — %s — R$ %.2f (%s)",
                salvo.getBarbeiro(), salvo.getTipoServico(), salvo.getValor(), salvo.getFormaPagamento()), request);
        return ResponseEntity.ok(salvo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluirCorte(@PathVariable Long id, HttpServletRequest request) {
        service.excluirCorte(id);
        auditService.log("EXCLUSAO", "Barbearia", "Apagou lançamento de corte ID #" + id, request);
        return ResponseEntity.noContent().build();
    }
}
