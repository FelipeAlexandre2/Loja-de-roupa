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

        for (MovimentacaoCaixa m : movs) {
            if ("SANGRIA".equalsIgnoreCase(m.getTipo())) {
                totalSangria = totalSangria.add(m.getValor());
            } else if ("SUPRIMENTO".equalsIgnoreCase(m.getTipo())) {
                totalSuprimento = totalSuprimento.add(m.getValor());
            }
        }

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("data", LocalDateTime.now().toLocalDate().toString());
        resumo.put("totalSangria", totalSangria);
        resumo.put("totalSuprimento", totalSuprimento);

        return resumo;
    }
}
