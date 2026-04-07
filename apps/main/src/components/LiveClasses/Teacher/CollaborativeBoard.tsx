import React from 'react';
import { CollaborativeBoard as SharedBoard } from '../Board/CollaborativeBoard';

interface TeacherBoardProps {
  roomId: string;
  isReadOnly?: boolean;
  isLocked?: boolean;
}

/**
 * Thin wrapper so TeacherRoomView can import from './CollaborativeBoard'.
 * Delegates to the shared Board/CollaborativeBoard which has Firestore sync.
 */
const CollaborativeBoard: React.FC<TeacherBoardProps> = ({ roomId, isReadOnly, isLocked }) => {
  return (
    <SharedBoard
      boardId={`class-${roomId}`}
      userId="teacher"
      userName="Professor"
      readOnly={isReadOnly || isLocked}
    />
  );
};

export default CollaborativeBoard;