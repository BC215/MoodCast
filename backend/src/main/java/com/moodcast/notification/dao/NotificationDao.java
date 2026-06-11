package com.moodcast.notification.dao;

import com.moodcast.notification.vo.Notification;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface NotificationDao {
    int insertNotification(Notification notification);
}
