package com.moodcast.member.dto.login;

import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@Data
public class RefreshTokenInfo {
    private Long memberId;
    private String tokenId;
    private boolean remember = true;

    public RefreshTokenInfo(Long memberId, String tokenId) {
        this(memberId, tokenId, true);
    }

    public RefreshTokenInfo(Long memberId, String tokenId, boolean remember) {
        this.memberId = memberId;
        this.tokenId = tokenId;
        this.remember = remember;
    }
}
