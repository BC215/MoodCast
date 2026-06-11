package com.moodcast.member.vo;

import lombok.Data;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Data
@Alias("Terms")

public class Terms {
    private Long termsId;
    private String termsType;
    private String version;
    private String title;
    private String content;
    private Integer isRequired;
    private Integer isActive;
    private LocalDateTime createdAt;
}

