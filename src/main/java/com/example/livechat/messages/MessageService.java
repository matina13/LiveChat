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
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messages;
    private final RoomRepository rooms;
    private final RoomMemberRepository members;
    private final UserRepository users;
    private final MessageReactionRepository reactions;

    public MessageService(
            MessageRepository messages,
            RoomRepository rooms,
            RoomMemberRepository members,
            UserRepository users,
            MessageReactionRepository reactions
    ) {
        this.messages = messages;
        this.rooms = rooms;
        this.members = members;
        this.users = users;
        this.reactions = reactions;
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

        if (request.replyToId() != null) {
            Message replyTo = messages.findById(request.replyToId())
                    .orElseThrow(() -> new IllegalArgumentException("Reply-to message not found"));
            if (!replyTo.getRoom().getId().equals(roomId)) {
                throw new IllegalArgumentException("Cannot reply to a message in another room");
            }
            message.setReplyTo(replyTo);
        }

        Message saved = messages.save(message);
        room.setLastMessageAt(saved.getCreatedAt());

        return toResponse(saved, "message", userId, List.of());
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

        return toResponse(saved, "edit", userId, reactions.findByMessage_Id(saved.getId()));
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

        List<Long> msgIds = results.stream().map(Message::getId).toList();
        Map<Long, List<MessageReaction>> rxnsByMsg = reactions.findByMessage_IdIn(msgIds).stream()
                .collect(Collectors.groupingBy(r -> r.getMessage().getId()));

        List<MessageResponse> response = results.stream()
                .map(m -> toResponse(m, "message", userId, rxnsByMsg.getOrDefault(m.getId(), List.of())))
                .toList();

        return new MessagesResponse(response, results.getNumber(), results.getSize(), results.getTotalElements());
    }

    @Transactional
    public void markRoomRead(long roomId, long userId) {
        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) return;
        members.updateLastReadAt(roomId, userId, OffsetDateTime.now());
    }

    @Transactional
    public MessageResponse createImageMessage(long roomId, long userId, String imageUrl) {
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
        message.setContent(imageUrl);
        message.setMessageType("image");

        Message saved = messages.save(message);
        room.setLastMessageAt(saved.getCreatedAt());

        return toResponse(saved, "message", userId, List.of());
    }

    @Transactional
    public Map<String, Object> toggleReaction(long roomId, long messageId, long userId, String emoji) {
        if (emoji == null || emoji.isBlank() || emoji.length() > 10) {
            throw new IllegalArgumentException("Invalid emoji");
        }

        Message message = messages.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        if (!message.getRoom().getId().equals(roomId)) {
            throw new IllegalArgumentException("Message not in this room");
        }
        if (!members.existsByRoom_IdAndUser_Id(roomId, userId)) {
            throw new IllegalArgumentException("Not a room member");
        }
        if (message.getDeletedAt() != null) {
            throw new IllegalArgumentException("Cannot react to a deleted message");
        }

        Optional<MessageReaction> existing = reactions.findByMessage_IdAndUser_IdAndEmoji(messageId, userId, emoji);
        if (existing.isPresent()) {
            reactions.delete(existing.get());
        } else {
            User user = users.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            MessageReaction reaction = new MessageReaction();
            reaction.setMessage(message);
            reaction.setUser(user);
            reaction.setEmoji(emoji);
            reactions.save(reaction);
        }

        Map<String, Long> counts = reactions.findByMessage_Id(messageId).stream()
                .collect(Collectors.groupingBy(MessageReaction::getEmoji, Collectors.counting()));

        return Map.of("type", "reaction", "messageId", messageId, "reactions", counts);
    }

    private MessageResponse toResponse(Message m, String type, long userId, List<MessageReaction> rxns) {
        boolean deleted = m.getDeletedAt() != null;
        Map<String, Long> reactionCounts = rxns.stream()
                .collect(Collectors.groupingBy(MessageReaction::getEmoji, Collectors.counting()));
        Set<String> myReactions = rxns.stream()
                .filter(r -> r.getUser().getId().equals(userId))
                .map(MessageReaction::getEmoji)
                .collect(Collectors.toSet());
        Message replyTo = m.getReplyTo();
        Long replyToId = replyTo != null ? replyTo.getId() : null;
        String replyToSenderUsername = replyTo != null ? replyTo.getSender().getUsername() : null;
        String replyToContent = replyTo != null && replyTo.getDeletedAt() == null ? replyTo.getContent() : null;
        return new MessageResponse(
                m.getId(),
                m.getRoom().getId(),
                m.getSender().getId(),
                m.getSender().getUsername(),
                deleted ? null : m.getContent(),
                m.getCreatedAt(),
                m.getEditedAt(),
                deleted,
                type,
                m.getMessageType(),
                reactionCounts,
                myReactions,
                replyToId,
                replyToSenderUsername,
                replyToContent
        );
    }
}
