package com.ttstore.backend.controller;

import com.ttstore.backend.model.VendaRequest;
import com.ttstore.backend.model.Venda;
import com.ttstore.backend.service.AuditService;
import com.ttstore.backend.service.VendaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vendas")
@CrossOrigin(origins = "*")
public class VendaController {

    private final VendaService vendaService;
    private final AuditService auditService;

    public VendaController(VendaService vendaService, AuditService auditService) {
        this.vendaService = vendaService;
        this.auditService = auditService;
    }

    @GetMapping
    public List<Venda> listarTodas() {
        return vendaService.listarTodas();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Venda> buscarPorId(@PathVariable Long id) {
        return vendaService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Venda realizarVenda(@RequestBody VendaRequest request, HttpServletRequest httpRequest) {
        Venda salva = vendaService.realizarVenda(request.getItens(), request.getFormaPagamento());
        auditService.log("CRIACAO", "PDV",
            String.format("Finalizou venda #%d no valor de R$ %s (Pagamento: %s)",
                salva.getId(), salva.getTotal() != null ? salva.getTotal().toString() : "0.00", salva.getFormaPagamento()), httpRequest);
        return salva;
    }

    @GetMapping("/resumo")
    public Map<String, Object> resumoDoDia() {
        return vendaService.buscarResumoDoDia();
    }
}
