package com.example.livechat.messages;

import com.example.livechat.rooms.Room;
import com.example.livechat.rooms.RoomMemberRepository;
import com.example.livechat.rooms.RoomRepository;
import com.example.livechat.users.User;
import com.example.livechat.users.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messages;
    private final RoomRepository rooms;
    private final RoomMemberRepository members;
    private final UserRepository users;

    public MessageService(
            MessageRepository messages,
            RoomRepository rooms,
            RoomMemberRepository members,
            UserRepository users
    ) {
        this.messages = messages;
        this.rooms = rooms;
        this.members = members;
        this.users = users;
    }

    @Transactional
    public MessageResponse sendMessage(long roomId, long userId, CreateMessageRequest request) {
        Room room = rooms.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) {
            throw new IllegalArgumentException("Not a room member");
        }

        User sender = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Message message = new Message();
        message.setRoom(room);
        message.setSender(sender);
        message.setContent(request.content().trim());

        Message saved = messages.save(message);
        room.setLastMessageAt(saved.getCreatedAt());

        return toResponse(saved, "message");
    }

    @Transactional
    public MessageResponse editMessage(long roomId, long messageId, long userId, EditMessageRequest request) {
        Message message = messages.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getRoom().getId().equals(roomId)) {
            throw new IllegalArgumentException("Message not in this room");
        }
        if (!message.getSender().getId().equals(userId)) {
            throw new IllegalArgumentException("Cannot edit another user's message");
        }
        if (message.getDeletedAt() != null) {
            throw new IllegalArgumentException("Cannot edit a deleted message");
        }

        message.setContent(request.content().trim());
        message.setEditedAt(OffsetDateTime.now());
        Message saved = messages.save(message);

        return toResponse(saved, "edit");
    }

    @Transactional
    public void deleteMessage(long roomId, long messageId, long userId) {
        Message message = messages.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getRoom().getId().equals(roomId)) {
            throw new IllegalArgumentException("Message not in this room");
        }
        if (!message.getSender().getId().equals(userId)) {
            throw new IllegalArgumentException("Cannot delete another user's message");
        }
        if (message.getDeletedAt() != null) {
            return; // already deleted — idempotent
        }

        message.setContent(null);
        message.setDeletedAt(OffsetDateTime.now());
        messages.save(message);
    }

    @Transactional(readOnly = true)
    public MessagesResponse listMessages(long roomId, long userId, int page, int size) {
        if (!rooms.existsById(roomId)) {
            throw new IllegalArgumentException("Room not found");
        }
        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) {
            throw new IllegalArgumentException("Not a room member");
        }

        Page<Message> results = messages.findByRoom_IdOrderByCreatedAtDesc(roomId, PageRequest.of(page, size));

        List<MessageResponse> response = results.stream()
                .map(m -> toResponse(m, "message"))
                .toList();

        return new MessagesResponse(response, results.getNumber(), results.getSize(), results.getTotalElements());
    }

    @Transactional
    public void markRoomRead(long roomId, long userId) {
        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) return;
        members.updateLastReadAt(roomId, userId, OffsetDateTime.now());
    }

    private MessageResponse toResponse(Message m, String type) {
        boolean deleted = m.getDeletedAt() != null;
        return new MessageResponse(
                m.getId(),
                m.getRoom().getId(),
                m.getSender().getId(),
                m.getSender().getUsername(),
                deleted ? null : m.getContent(),
                m.getCreatedAt(),
                m.getEditedAt(),
                deleted,
                type
        );
    }
}
