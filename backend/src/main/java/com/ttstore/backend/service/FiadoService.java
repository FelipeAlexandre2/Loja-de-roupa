package com.ttstore.backend.service;

import com.ttstore.backend.model.ClienteFiado;
import com.ttstore.backend.model.LancamentoFiado;
import com.ttstore.backend.repository.ClienteFiadoRepository;
import com.ttstore.backend.repository.LancamentoFiadoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class FiadoService {

    private final ClienteFiadoRepository clienteRepo;
    private final LancamentoFiadoRepository lancamentoRepo;

    public FiadoService(ClienteFiadoRepository clienteRepo,
                        LancamentoFiadoRepository lancamentoRepo) {
        this.clienteRepo = clienteRepo;
        this.lancamentoRepo = lancamentoRepo;
    }

    /* ── Clientes ─────────────────────────────────────────────── */

    public List<ClienteFiado> listarClientes() {
        return clienteRepo.findAllByOrderByNomeAsc();
    }

    public Optional<ClienteFiado> buscarClientePorId(Long id) {
        return clienteRepo.findById(id);
    }

    @Transactional
    public ClienteFiado criarCliente(String nome, String telefone, String cpf, String endereco) {
        ClienteFiado c = new ClienteFiado(nome, telefone, cpf, endereco);
        return clienteRepo.save(c);
    }

    @Transactional
    public void deletarCliente(Long id) {
        ClienteFiado c = clienteRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado"));
        lancamentoRepo.deleteByClienteFiado(c);
        clienteRepo.delete(c);
    }

    /* ── Lançamentos ──────────────────────────────────────────── */

    public List<LancamentoFiado> listarLancamentos(Long clienteId) {
        ClienteFiado c = clienteRepo.findById(clienteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado"));
        return lancamentoRepo.findByClienteFiadoOrderByDataDesc(c);
    }

    @Transactional
    public LancamentoFiado registrarLancamento(Long clienteId,
                                               LancamentoFiado.Tipo tipo,
                                               Double valor,
                                               String descricao) {
        if (valor == null || valor <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor inválido");
        }

        ClienteFiado c = clienteRepo.findById(clienteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado"));

        LancamentoFiado l = new LancamentoFiado();
        l.setClienteFiado(c);
        l.setTipo(tipo);
        l.setValor(valor);
        l.setDescricao(descricao);
        l.setData(LocalDateTime.now());
        lancamentoRepo.save(l);

        // Atualiza saldo
        if (tipo == LancamentoFiado.Tipo.DEBITO) {
            c.setTotalDevido(c.getTotalDevido() + valor);
        } else {
            c.setTotalDevido(Math.max(0, c.getTotalDevido() - valor));
        }
        c.setUltimoLancamento(l.getData());
        clienteRepo.save(c);

        return l;
    }

    /* ── Resumo do dia para o Caixa ───────────────────────────── */

    public Map<String, Object> resumoHoje() {
        LocalDateTime inicio = LocalDate.now().atStartOfDay();
        LocalDateTime fim    = inicio.plusDays(1);

        List<LancamentoFiado> lancamentos = lancamentoRepo.findByDataBetween(inicio, fim);

        double totalPagamentos = lancamentos.stream()
                .filter(l -> l.getTipo() == LancamentoFiado.Tipo.PAGAMENTO)
                .mapToDouble(LancamentoFiado::getValor)
                .sum();

        double totalFiados = lancamentos.stream()
                .filter(l -> l.getTipo() == LancamentoFiado.Tipo.DEBITO)
                .mapToDouble(LancamentoFiado::getValor)
                .sum();

        long qtdPagamentos = lancamentos.stream()
                .filter(l -> l.getTipo() == LancamentoFiado.Tipo.PAGAMENTO)
                .count();

        long qtdFiados = lancamentos.stream()
                .filter(l -> l.getTipo() == LancamentoFiado.Tipo.DEBITO)
                .count();

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("data", LocalDate.now().toString());
        resumo.put("totalPagamentosHoje", totalPagamentos);
        resumo.put("totalFiadosHoje", totalFiados);
        resumo.put("qtdPagamentos", qtdPagamentos);
        resumo.put("qtdFiados", qtdFiados);
        return resumo;
    }
}
