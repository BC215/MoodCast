package com.moodcast.member.dao;

import com.moodcast.member.vo.Member;
import com.moodcast.member.vo.Terms;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface SignupDao {

    int countByEmail(@Param("email") String email);
    int countByNickname(@Param("nickname") String nickname);

    List<Terms> findActiveTerms();

    List<Terms> findRequiredTerms();

    int insertMember(Member member);

    int insertMemberTermsAgreement(
            @Param("memberId") Long memberId,
            @Param("termsId") Long termsId,
            @Param("agreed") Integer agreed
    );
}
