package com.fearlesstasting.api.admin.service;

import com.fearlesstasting.api.admin.entity.DemoAccount;
import com.fearlesstasting.api.admin.repository.DemoAccountRepository;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.security.SecureRandom;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 관리자 데모 계정 CRUD. */
@Service
@RequiredArgsConstructor
public class DemoAccountService {

    private static final SecureRandom RNG = new SecureRandom();

    private final DemoAccountRepository demoRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<DemoAccount> list() {
        return demoRepository.findAllWithUser();
    }

    /** 새 User 생성 + DemoAccount 연결. nickname/email 자동 생성. */
    @Transactional
    public DemoAccount createNew(String memo) {
        String suffix = Long.toString(System.currentTimeMillis(), 36) + RNG.nextInt(999);
        String email = "demo_" + suffix + "@fearless.local";
        String nickname = uniqueNickname("데모_" + suffix);

        User user = userRepository.save(User.builder()
            .email(email).nickname(nickname).role("user").pushEnabled(false).build());

        return demoRepository.save(DemoAccount.builder().user(user).memo(memo).build());
    }

    @Transactional
    public DemoAccount updateMemo(String id, String memo) {
        DemoAccount d = demoRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("데모 계정을 찾을 수 없습니다."));
        d.updateMemo(memo);
        return d;
    }

    @Transactional
    public void delete(String id) {
        DemoAccount d = demoRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("데모 계정을 찾을 수 없습니다."));
        userRepository.delete(d.getUser()); // cascade로 DemoAccount도 삭제
    }

    private String uniqueNickname(String base) {
        String candidate = base;
        while (userRepository.existsByNickname(candidate)) {
            candidate = base + "_" + RNG.nextInt(999);
        }
        return candidate;
    }
}
