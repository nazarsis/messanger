import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  nickname: string;
  display_name: string;
  email: string;
  is_online: boolean;
}

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    if (searching) return;
    
    setSearching(true);
    try {
      const results = await apiRequest(`/users/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const toggleUserSelection = (selectedUser: User) => {
    const isSelected = selectedUsers.find(u => u.id === selectedUser.id);
    
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== selectedUser.id));
    } else {
      setSelectedUsers([...selectedUsers, selectedUser]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_type: 'group',
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          participants: selectedUsers.map(u => u.id),
        }),
      });

      Alert.alert(
        'Success',
        'Group created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/chat/${response.id}`)
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating group:', error);
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.find(u => u.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{item.display_name}</Text>
          <Text style={styles.nickname}>@{item.nickname}</Text>
        </View>

        <View style={styles.onlineIndicator}>
          <View style={[
            styles.onlineDot,
            { backgroundColor: item.is_online ? '#34C759' : '#8E8E93' }
          ]} />
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectedUser = ({ item }: { item: User }) => (
    <View style={styles.selectedUserTag}>
      <Text style={styles.selectedUserText}>{item.display_name}</Text>
      <TouchableOpacity
        onPress={() => toggleUserSelection(item)}
        style={styles.removeButton}
      >
        <Ionicons name="close" size={16} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>New Group</Text>
          
          <TouchableOpacity
            style={[styles.createButton, (!groupName.trim() || selectedUsers.length === 0 || loading) && styles.createButtonDisabled]}
            onPress={createGroup}
            disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
          >
            <Text style={[styles.createButtonText, (!groupName.trim() || selectedUsers.length === 0 || loading) && styles.createButtonTextDisabled]}>
              {loading ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group Info */}
        <View style={styles.groupInfoSection}>
          <View style={styles.groupAvatar}>
            <Ionicons name="people" size={32} color="#007AFF" />
          </View>
          
          <View style={styles.groupInputs}>
            <TextInput
              style={styles.groupNameInput}
              placeholder="Group Name"
              placeholderTextColor="#8E8E93"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />
            
            <TextInput
              style={styles.groupDescriptionInput}
              placeholder="Description (optional)"
              placeholderTextColor="#8E8E93"
              value={groupDescription}
              onChangeText={setGroupDescription}
              maxLength={200}
              multiline
            />
          </View>
        </View>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <View style={styles.selectedUsersSection}>
            <Text style={styles.sectionTitle}>
              Selected Participants ({selectedUsers.length})
            </Text>
            <FlatList
              data={selectedUsers}
              renderItem={renderSelectedUser}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedUsersList}
            />
          </View>
        )}

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users to add..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Search Results */}
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          style={styles.usersList}
          ListEmptyComponent={
            searchQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="person-outline" size={64} color="#8E8E93" />
                <Text style={styles.emptyText}>
                  {searching ? 'Searching...' : 'No users found'}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#8E8E93" />
                <Text style={styles.emptyText}>Search for users to add to your group</Text>
              </View>
            )
          }
        />
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#8E8E93',
  },
  groupInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groupInputs: {
    flex: 1,
  },
  groupNameInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    paddingBottom: 8,
  },
  groupDescriptionInput: {
    fontSize: 14,
    color: '#8E8E93',
    minHeight: 40,
  },
  selectedUsersSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  selectedUsersList: {
    marginHorizontal: -4,
  },
  selectedUserTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  selectedUserText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  removeButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  userItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  nickname: {
    fontSize: 14,
    color: '#8E8E93',
  },
  onlineIndicator: {
    marginRight: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
});