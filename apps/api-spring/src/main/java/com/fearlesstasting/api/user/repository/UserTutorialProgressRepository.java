package com.fearlesstasting.api.user.repository;

import com.fearlesstasting.api.user.entity.UserTutorialProgress;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserTutorialProgressRepository extends JpaRepository<UserTutorialProgress, String> {

    List<UserTutorialProgress> findAllByUserId(String userId);

    Optional<UserTutorialProgress> findByUserIdAndTutorialKey(String userId, String tutorialKey);
}
