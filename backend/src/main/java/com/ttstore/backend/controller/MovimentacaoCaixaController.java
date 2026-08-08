package com.ttstore.backend.controller;

import com.ttstore.backend.model.MovimentacaoCaixa;
import com.ttstore.backend.service.AuditService;
import com.ttstore.backend.service.MovimentacaoCaixaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/caixamovimento")
@CrossOrigin(origins = "*")
public class MovimentacaoCaixaController {
    private final MovimentacaoCaixaService service;
    private final AuditService auditService;

    public MovimentacaoCaixaController(MovimentacaoCaixaService service, AuditService auditService) {
        this.service = service;
        this.auditService = auditService;
    }

    @PostMapping
    public MovimentacaoCaixa registrar(@RequestBody MovimentacaoCaixa mov, HttpServletRequest request) {
        MovimentacaoCaixa salva = service.registrar(mov);
        auditService.log("CRIACAO", "Caixa",
            String.format("Registrou movimentação no caixa (%s): R$ %.2f - %s",
                salva.getTipo(), salva.getValor(), salva.getDescricao() != null ? salva.getDescricao() : "Sem observação"), request);
        return salva;
    }

    @GetMapping("/resumo")
    public Map<String, Object> resumoDoDia() {
        return service.buscarResumoDoDia();
    }
}
