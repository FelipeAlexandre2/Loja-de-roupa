package com.ttstore.backend.controller;

import com.ttstore.backend.model.*;
import com.ttstore.backend.repository.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/relatorio")
@CrossOrigin(origins = "*")
public class RelatorioController {

    private final VendaRepository vendaRepo;
    private final CorteBarbeariaRepository corteRepo;
    private final MovimentacaoCaixaRepository movRepo;
    private final LancamentoFiadoRepository lancFiadoRepo;
    private final ClienteFiadoRepository clienteFiadoRepo;

    public RelatorioController(VendaRepository vendaRepo,
                               CorteBarbeariaRepository corteRepo,
                               MovimentacaoCaixaRepository movRepo,
                               LancamentoFiadoRepository lancFiadoRepo,
                               ClienteFiadoRepository clienteFiadoRepo) {
        this.vendaRepo      = vendaRepo;
        this.corteRepo      = corteRepo;
        this.movRepo        = movRepo;
        this.lancFiadoRepo  = lancFiadoRepo;
        this.clienteFiadoRepo = clienteFiadoRepo;
    }

    @GetMapping
    public Map<String, Object> gerarRelatorio(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {

        if (dataFim   == null) dataFim   = LocalDate.now();
        if (dataInicio == null) dataInicio = dataFim.withDayOfMonth(1);

        LocalDateTime inicio = dataInicio.atStartOfDay();
        LocalDateTime fim    = dataFim.plusDays(1).atStartOfDay();

        /* ── Vendas ─────────────────────────────────────────────────── */
        List<Venda> vendas = vendaRepo.findByDataHoraBetween(inicio, fim);

        double totalVendas = vendas.stream()
                .mapToDouble(v -> v.getTotal() != null ? v.getTotal().doubleValue() : 0)
                .sum();

        Map<String, Double> vendasPorPagamento = new HashMap<>();
        for (Venda v : vendas) {
            String fp = v.getFormaPagamento() != null ? v.getFormaPagamento() : "Outros";
            vendasPorPagamento.merge(fp, v.getTotal() != null ? v.getTotal().doubleValue() : 0, Double::sum);
        }

        Map<String, Object> vendasMap = new LinkedHashMap<>();
        vendasMap.put("total", totalVendas);
        vendasMap.put("quantidade", vendas.size());
        vendasMap.put("porFormaPagamento", vendasPorPagamento);

        /* ── Barbearia ──────────────────────────────────────────────── */
        List<CorteBarbearia> cortes = corteRepo.findByDataCorteBetween(inicio, fim);

        double totalBarbearia = cortes.stream()
                .mapToDouble(c -> c.getValor() != null ? c.getValor().doubleValue() : 0)
                .sum();

        // Por barbeiro
        Map<String, Object> bPorBarbeiro = new LinkedHashMap<>();
        for (String nome : List.of("Jacson", "Mizael")) {
            List<CorteBarbearia> sub = cortes.stream()
                    .filter(c -> nome.equals(c.getBarbeiro())).collect(Collectors.toList());
            Map<String, Object> b = new LinkedHashMap<>();
            b.put("total",     sub.stream().mapToDouble(c -> c.getValor().doubleValue()).sum());
            b.put("quantidade", sub.size());
            bPorBarbeiro.put(nome, b);
        }

        // Por forma de pagamento
        Map<String, Double> barbPorPagamento = new LinkedHashMap<>();
        for (CorteBarbearia c : cortes) {
            String fp = c.getFormaPagamento() != null ? c.getFormaPagamento() : "Outros";
            barbPorPagamento.merge(fp, c.getValor().doubleValue(), Double::sum);
        }

        // Por tipo de serviço
        Map<String, Double> barbPorServico = new LinkedHashMap<>();
        for (CorteBarbearia c : cortes) {
            String ts = c.getTipoServico() != null ? c.getTipoServico() : "Cabelo";
            barbPorServico.merge(ts, c.getValor().doubleValue(), Double::sum);
        }

        Map<String, Object> barbeariaMap = new LinkedHashMap<>();
        barbeariaMap.put("total",              totalBarbearia);
        barbeariaMap.put("quantidade",         cortes.size());
        barbeariaMap.put("porBarbeiro",        bPorBarbeiro);
        barbeariaMap.put("porFormaPagamento",  barbPorPagamento);
        barbeariaMap.put("porServico",         barbPorServico);

        /* ── Caixa ──────────────────────────────────────────────────── */
        List<MovimentacaoCaixa> movimentos = movRepo.findByDataHoraBetween(inicio, fim);

        double totalSangria    = movimentos.stream()
                .filter(m -> "SANGRIA".equals(m.getTipo()))
                .mapToDouble(m -> m.getValor() != null ? m.getValor().doubleValue() : 0)
                .sum();
        double totalSuprimento = movimentos.stream()
                .filter(m -> "SUPRIMENTO".equals(m.getTipo()))
                .mapToDouble(m -> m.getValor() != null ? m.getValor().doubleValue() : 0)
                .sum();

        Map<String, Object> caixaMap = new LinkedHashMap<>();
        caixaMap.put("totalSangria",    totalSangria);
        caixaMap.put("totalSuprimento", totalSuprimento);

        /* ── Fiado ──────────────────────────────────────────────────── */
        List<LancamentoFiado> lancamentos = lancFiadoRepo.findByDataBetween(inicio, fim);

        double totalDebitos    = lancamentos.stream()
                .filter(l -> l.getTipo() == LancamentoFiado.Tipo.DEBITO)
                .mapToDouble(LancamentoFiado::getValor).sum();
        double totalPagamentosFiado = lancamentos.stream()
                .filter(l -> l.getTipo() == LancamentoFiado.Tipo.PAGAMENTO)
                .mapToDouble(LancamentoFiado::getValor).sum();

        List<ClienteFiado> todosClientes = clienteFiadoRepo.findAll();
        double totalDevidoGeral = todosClientes.stream()
                .mapToDouble(c -> c.getTotalDevido() != null ? c.getTotalDevido() : 0).sum();
        long clientesComSaldo  = todosClientes.stream()
                .filter(c -> c.getTotalDevido() != null && c.getTotalDevido() > 0).count();

        Map<String, Object> fiadoMap = new LinkedHashMap<>();
        fiadoMap.put("totalDebitosNoPeriodo",    totalDebitos);
        fiadoMap.put("totalPagamentosNoPeriodo", totalPagamentosFiado);
        fiadoMap.put("quantidadeDebitos",        (long) lancamentos.stream().filter(l -> l.getTipo() == LancamentoFiado.Tipo.DEBITO).count());
        fiadoMap.put("quantidadePagamentos",     (long) lancamentos.stream().filter(l -> l.getTipo() == LancamentoFiado.Tipo.PAGAMENTO).count());
        fiadoMap.put("clientesComSaldo",         clientesComSaldo);
        fiadoMap.put("totalDevidoGeral",         totalDevidoGeral);
        fiadoMap.put("totalClientes",            (long) todosClientes.size());

        /* ── Resumo Consolidado ─────────────────────────────────────── */
        double faturamentoTotal = totalVendas + totalBarbearia + totalPagamentosFiado;
        double saldoCaixa       = faturamentoTotal + totalSuprimento - totalSangria;

        Map<String, Object> resumoMap = new LinkedHashMap<>();
        resumoMap.put("faturamentoTotal", faturamentoTotal);
        resumoMap.put("vendasPDV",        totalVendas);
        resumoMap.put("barbearia",        totalBarbearia);
        resumoMap.put("fiadoRecebido",    totalPagamentosFiado);
        resumoMap.put("saldoCaixa",       saldoCaixa);

        /* ── Response ───────────────────────────────────────────────── */
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("periodo",   Map.of("dataInicio", dataInicio.toString(), "dataFim", dataFim.toString()));
        response.put("resumo",    resumoMap);
        response.put("vendas",    vendasMap);
        response.put("barbearia", barbeariaMap);
        response.put("caixa",     caixaMap);
        response.put("fiado",     fiadoMap);
        return response;
    }
}
