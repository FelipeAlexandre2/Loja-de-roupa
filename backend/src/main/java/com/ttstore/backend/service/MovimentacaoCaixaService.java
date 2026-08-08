package com.ttstore.backend.service;

import com.ttstore.backend.model.MovimentacaoCaixa;
import com.ttstore.backend.repository.MovimentacaoCaixaRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MovimentacaoCaixaService {
    private final MovimentacaoCaixaRepository repository;

    public MovimentacaoCaixaService(MovimentacaoCaixaRepository repository) {
        this.repository = repository;
    }

    public MovimentacaoCaixa registrar(MovimentacaoCaixa mov) {
        if (mov.getDataHora() == null) {
            mov.setDataHora(LocalDateTime.now());
        }
        return repository.save(mov);
    }

    public Map<String, Object> buscarResumoDoDia() {
        LocalDateTime inicioDoDia = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime fimDoDia = LocalDateTime.now().toLocalDate().atTime(LocalTime.MAX);

        List<MovimentacaoCaixa> movs = repository.findByDataHoraBetween(inicioDoDia, fimDoDia);

        BigDecimal totalSuprimento = BigDecimal.ZERO;
        BigDecimal totalSangria = BigDecimal.ZERO;
        BigDecimal valorAbertura = BigDecimal.ZERO;
        BigDecimal valorFechamento = BigDecimal.ZERO;
        BigDecimal diferencaFechamento = BigDecimal.ZERO;
        String statusCaixa = "FECHADO";
        String dataHoraAbertura = null;
        String dataHoraFechamento = null;

        for (MovimentacaoCaixa m : movs) {
            String t = m.getTipo() != null ? m.getTipo().toUpperCase() : "";
            if ("SANGRIA".equals(t) || "RETIRADA".equals(t)) {
                totalSangria = totalSangria.add(m.getValor());
            } else if ("SUPRIMENTO".equals(t) || "TROCO".equals(t)) {
                totalSuprimento = totalSuprimento.add(m.getValor());
            } else if ("ABERTURA".equals(t)) {
                valorAbertura = m.getValor();
                totalSuprimento = totalSuprimento.add(m.getValor());
                statusCaixa = "ABERTO";
                dataHoraAbertura = m.getDataHora().toString();
            } else if ("FECHAMENTO".equals(t)) {
                valorFechamento = m.getValor();
                if (m.getDiferenca() != null) {
                    diferencaFechamento = m.getDiferenca();
                }
                statusCaixa = "FECHADO";
                dataHoraFechamento = m.getDataHora().toString();
            }
        }

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("data", LocalDateTime.now().toLocalDate().toString());
        resumo.put("totalSangria", totalSangria);
        resumo.put("totalSuprimento", totalSuprimento);
        resumo.put("totalRetirada", totalSangria);
        resumo.put("totalTroco", totalSuprimento);
        resumo.put("valorAbertura", valorAbertura);
        resumo.put("valorFechamento", valorFechamento);
        resumo.put("diferencaFechamento", diferencaFechamento);
        resumo.put("statusCaixa", statusCaixa);
        resumo.put("dataHoraAbertura", dataHoraAbertura);
        resumo.put("dataHoraFechamento", dataHoraFechamento);
        resumo.put("movimentacoes", movs);

        return resumo;
    }
}
