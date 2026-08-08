package com.ttstore.backend.service;

import com.ttstore.backend.model.CorteBarbearia;
import com.ttstore.backend.repository.CorteBarbeariaRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CorteBarbeariaService {

    private final CorteBarbeariaRepository repository;

    public CorteBarbeariaService(CorteBarbeariaRepository repository) {
        this.repository = repository;
    }

    public CorteBarbearia registrarCorte(CorteBarbearia corte) {
        // Validação básica
        if(!corte.getBarbeiro().equalsIgnoreCase("Jacson") && !corte.getBarbeiro().equalsIgnoreCase("Mizael")) {
            throw new IllegalArgumentException("Barbeiro inválido. Selecione Jacson ou Mizael.");
        }
        return repository.save(corte);
    }

    public void excluirCorte(Long id) {
        repository.deleteById(id);
    }

    // Retorna todos os cortes do dia atual e os totais agrupados
    public Map<String, Object> buscarResumoDoDia() {
        LocalDateTime inicioDoDia = LocalDate.now().atStartOfDay();
        LocalDateTime fimDoDia = LocalDate.now().plusDays(1).atStartOfDay().minusNanos(1);

        List<CorteBarbearia> cortesHoje = repository.findByDataCorteBetweenOrderByDataCorteDesc(inicioDoDia, fimDoDia);

        int qtdJacson = 0;
        BigDecimal totalJacson = BigDecimal.ZERO;

        int qtdMizael = 0;
        BigDecimal totalMizael = BigDecimal.ZERO;

        for (CorteBarbearia c : cortesHoje) {
            if (c.getBarbeiro().equalsIgnoreCase("Jacson")) {
                qtdJacson++;
                totalJacson = totalJacson.add(c.getValor());
            } else if (c.getBarbeiro().equalsIgnoreCase("Mizael")) {
                qtdMizael++;
                totalMizael = totalMizael.add(c.getValor());
            }
        }

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("cortesDia", cortesHoje);
        
        Map<String, Object> jacson = new HashMap<>();
        jacson.put("quantidade", qtdJacson);
        jacson.put("total", totalJacson);
        
        Map<String, Object> mizael = new HashMap<>();
        mizael.put("quantidade", qtdMizael);
        mizael.put("total", totalMizael);

        resumo.put("jacson", jacson);
        resumo.put("mizael", mizael);
        resumo.put("totalCortes", qtdJacson + qtdMizael);
        resumo.put("totalArrecadado", totalJacson.add(totalMizael));

        return resumo;
    }
}
