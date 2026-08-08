package com.ttstore.backend.repository;

import com.ttstore.backend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByDataHoraBetweenOrderByIdDesc(LocalDateTime start, LocalDateTime end);

    List<AuditLog> findAllByOrderByIdDesc();

    long countByDataHoraBetween(LocalDateTime start, LocalDateTime end);

    long countByDataHoraBetweenAndAcao(LocalDateTime start, LocalDateTime end, String acao);

    @Transactional
    long deleteByDataHoraBefore(LocalDateTime limite);
}
