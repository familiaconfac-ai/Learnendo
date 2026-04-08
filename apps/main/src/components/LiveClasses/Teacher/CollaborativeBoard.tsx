import React, { useMemo } from 'react';
import { CollaborativeBoard as SharedBoard } from '../Board/CollaborativeBoard';

interface TeacherBoardProps {
  roomId: string;
  userId: string;
  userName: string;
  isReadOnly?: boolean;
  isLocked?: boolean;
}

const CollaborativeBoard: React.FC<TeacherBoardProps> = ({ roomId, userId, userName, isReadOnly }) => {
  const memoizedBoard = useMemo(() => (
    <SharedBoard
      boardId={`class-${roomId}`}
      userId={userId}
      userName={userName}
      readOnly={isReadOnly}
    />
  ), [roomId, userId, userName, isReadOnly]);

  return (
    <div className="w-full h-full">
      {memoizedBoard}
    </div>
  );
};

export default CollaborativeBoard;
