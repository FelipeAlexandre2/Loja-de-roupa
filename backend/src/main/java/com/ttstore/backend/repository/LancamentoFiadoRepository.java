package com.ttstore.backend.repository;

import com.ttstore.backend.model.ClienteFiado;
import com.ttstore.backend.model.LancamentoFiado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LancamentoFiadoRepository extends JpaRepository<LancamentoFiado, Long> {
    List<LancamentoFiado> findByClienteFiadoOrderByDataDesc(ClienteFiado clienteFiado);
    void deleteByClienteFiado(ClienteFiado clienteFiado);
    List<LancamentoFiado> findByDataBetween(LocalDateTime inicio, LocalDateTime fim);
}
