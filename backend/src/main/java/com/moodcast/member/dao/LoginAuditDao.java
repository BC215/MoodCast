package com.moodcast.member.dao;

import com.moodcast.member.vo.LoginAuditLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface LoginAuditDao {
    int insertLoginAuditLog(LoginAuditLog loginAuditLog);
}
