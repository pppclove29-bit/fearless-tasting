package com.fearlesstasting.api.fcm.repository;

import com.fearlesstasting.api.fcm.entity.FcmToken;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FcmTokenRepository extends JpaRepository<FcmToken, String> {

    Optional<FcmToken> findByToken(String token);

    List<FcmToken> findAllByUserId(String userId);

    List<FcmToken> findAllByUserIdIn(Collection<String> userIds);

    void deleteByToken(String token);
}
