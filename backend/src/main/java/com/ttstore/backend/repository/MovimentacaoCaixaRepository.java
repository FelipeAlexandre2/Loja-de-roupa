package com.ttstore.backend.repository;

import com.ttstore.backend.model.MovimentacaoCaixa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimentacaoCaixaRepository extends JpaRepository<MovimentacaoCaixa, Long> {
    List<MovimentacaoCaixa> findByDataHoraBetween(LocalDateTime start, LocalDateTime end);
}
