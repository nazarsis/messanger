import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import LoadingScreen from '../../components/LoadingScreen';

const { width: screenWidth } = Dimensions.get('window');

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  timestamp: string;
  status: string;
  reply_to?: string;
  file_data?: string;
  file_name?: string;
  file_size?: number;
}

interface Chat {
  id: string;
  participants: string[];
  chat_type: string;
  name?: string;
  description?: string;
  participants_info?: Array<{
    id: string;
    nickname: string;
    display_name: string;
    is_online?: boolean;
  }>;
}

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<Chat | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!chatId) return;

    loadChat();
    loadMessages();
    initializeWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [chatId]);

  const initializeWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token || !user) return;

      // Create WebSocket URL
      const wsUrl = `${BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws/chat/${chatId}?token=${token}`;
      
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.type === 'new_message') {
          setMessages((prev) => [...prev, data.message]);
          // Scroll to bottom after adding new message
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setWs(null);
      };

    } catch (error) {
      console.error('WebSocket initialization error:', error);
    }
  };

  const loadChat = async () => {
    try {
      const chats = await apiRequest('/chats');
      const currentChat = chats.find((c: Chat) => c.id === chatId);
      if (currentChat) {
        setChat(currentChat);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'Failed to load chat details');
    }
  };

  const loadMessages = async () => {
    try {
      const response = await apiRequest(`/chats/${chatId}/messages`);
      setMessages(response);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText) return;

    setNewMessage('');

    try {
      const response = await apiRequest(`/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageText,
          message_type: 'text',
        }),
      });

      // Add message to local state
      setMessages((prev) => [...prev, response]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Restore the message text on error
      setNewMessage(messageText);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need camera roll permissions to share images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const asset = result.assets[0];
        const base64Data = asset.base64!;
        
        const response = await apiRequest(`/chats/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: asset.fileName || 'Image',
            message_type: 'image',
            file_data: base64Data,
            file_name: asset.fileName,
            file_size: asset.fileSize,
          }),
        });

        setMessages((prev) => [...prev, response]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to send image');
      } finally {
        setUploading(false);
        setShowAttachmentOptions(false);
      }
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];

        // Read file as base64
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            
            const messageResponse = await apiRequest(`/chats/${chatId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: asset.name,
                message_type: 'file',
                file_data: base64Data,
                file_name: asset.name,
                file_size: asset.size,
              }),
            });

            setMessages((prev) => [...prev, messageResponse]);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          } catch (error) {
            console.error('Error uploading document:', error);
            Alert.alert('Error', 'Failed to send document');
          } finally {
            setUploading(false);
            setShowAttachmentOptions(false);
          }
        };
        
        reader.readAsDataURL(blob);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
      setUploading(false);
      setShowAttachmentOptions(false);
    }
  };

  const getChatTitle = () => {
    if (!chat) return 'Chat';
    
    if (chat.chat_type === 'group') {
      return chat.name || 'Group Chat';
    }
    
    const otherParticipant = chat.participants_info?.find(p => p.id !== user?.id);
    return otherParticipant?.display_name || otherParticipant?.nickname || 'Unknown User';
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{getChatTitle()}</Text>
            <Text style={styles.headerSubtitle}>
              {chat?.participants.length} participants
            </Text>
          </View>

          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#8E8E93" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start the conversation!
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#8E8E93"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={newMessage.trim() ? '#FFF' : '#8E8E93'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  menuButton: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#2C2C2E',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFF',
  },
  otherMessageText: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
});