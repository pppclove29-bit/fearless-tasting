package com.fearlesstasting.api.admin.repository;

import com.fearlesstasting.api.admin.entity.DemoAccount;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DemoAccountRepository extends JpaRepository<DemoAccount, String> {

    Optional<DemoAccount> findByUserId(String userId);

    @Query("""
        select d from DemoAccount d
        join fetch d.user
        order by d.createdAt desc
        """)
    List<DemoAccount> findAllWithUser();
}
