package com.ttstore.backend.controller;

import com.ttstore.backend.model.ClienteFiado;
import com.ttstore.backend.model.LancamentoFiado;
import com.ttstore.backend.service.AuditService;
import com.ttstore.backend.service.FiadoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fiado")
@CrossOrigin(origins = "*")
public class FiadoController {

    private final FiadoService fiadoService;
    private final AuditService auditService;

    public FiadoController(FiadoService fiadoService, AuditService auditService) {
        this.fiadoService = fiadoService;
        this.auditService = auditService;
    }

    /* ── Clientes ─────────────────────────────────────────────── */

    @GetMapping("/clientes")
    public List<ClienteFiado> listarClientes() {
        return fiadoService.listarClientes();
    }

    @GetMapping("/resumo/hoje")
    public Map<String, Object> resumoHoje() {
        return fiadoService.resumoHoje();
    }

    @GetMapping("/clientes/{id}")
    public ResponseEntity<ClienteFiado> buscarCliente(@PathVariable Long id) {
        return fiadoService.buscarClientePorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/clientes")
    public ResponseEntity<ClienteFiado> criarCliente(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String nome = body.get("nome");
        if (nome == null || nome.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        ClienteFiado criado = fiadoService.criarCliente(
            nome,
            body.get("telefone"),
            body.get("cpf"),
            body.get("endereco")
        );
        auditService.log("CRIACAO", "Fiado", String.format("Cadastrou novo cliente de fiado '%s'", nome), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(criado);
    }

    @DeleteMapping("/clientes/{id}")
    public ResponseEntity<Void> deletarCliente(@PathVariable Long id, HttpServletRequest request) {
        fiadoService.buscarClientePorId(id).ifPresent(c -> {
            auditService.log("EXCLUSAO", "Fiado", String.format("Apagou cliente de fiado '%s' (ID #%d)", c.getNome(), id), request);
        });
        fiadoService.deletarCliente(id);
        return ResponseEntity.noContent().build();
    }

    /* ── Lançamentos ──────────────────────────────────────────── */

    @GetMapping("/clientes/{id}/lancamentos")
    public List<LancamentoFiado> listarLancamentos(@PathVariable Long id) {
        return fiadoService.listarLancamentos(id);
    }

    @PostMapping("/lancamentos")
    public ResponseEntity<LancamentoFiado> registrarLancamento(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long clienteId = Long.valueOf(body.get("clienteId").toString());
        LancamentoFiado.Tipo tipo = LancamentoFiado.Tipo.valueOf(body.get("tipo").toString());
        Double valor = Double.valueOf(body.get("valor").toString());
        String descricao = body.containsKey("descricao") ? (String) body.get("descricao") : null;

        LancamentoFiado l = fiadoService.registrarLancamento(clienteId, tipo, valor, descricao);
        String clienteNome = fiadoService.buscarClientePorId(clienteId).map(ClienteFiado::getNome).orElse("Desconhecido");
        
        String tipoStr = tipo == LancamentoFiado.Tipo.DEBITO ? "débito (fiado)" : "pagamento";
        auditService.log("CRIACAO", "Fiado",
            String.format("Registrou %s de R$ %.2f para o cliente '%s'", tipoStr, valor, clienteNome), request);

        return ResponseEntity.status(HttpStatus.CREATED).body(l);
    }
}
