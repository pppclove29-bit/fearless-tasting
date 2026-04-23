package com.fearlesstasting.api.auth.repository;

import com.fearlesstasting.api.auth.entity.Account;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AccountRepository extends JpaRepository<Account, String> {

    @Query("""
        select a from Account a
        join fetch a.user
        where a.provider = :provider and a.providerId = :providerId
        """)
    Optional<Account> findByProviderAndProviderIdWithUser(String provider, String providerId);

    @Query("""
        select a from Account a
        join fetch a.user
        where a.user.id = :userId
        """)
    Optional<Account> findByUserIdWithUser(String userId);
}
