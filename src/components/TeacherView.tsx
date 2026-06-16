import React, { useState, useEffect } from 'react';
import { 
  Classroom, User, RoomParticipant, Quest, 
  QuestSubmission, LuckyWheelItemConfig 
} from '../types';
import { db, addSystemNotification, getLevelInfo } from '../mockData';
import { 
  Users, Plus, Trash2, Copy, FileSpreadsheet, PlusCircle, MinusCircle, 
  BookOpen, HelpCircle, Save, Settings, Sliders, Play, AlertTriangle, Calendar
} from 'lucide-react';

interface TeacherViewProps {
  teacherId: string;
  activeRoomId: string;
  onActiveRoomChanged: (id: string) => void;
  onDataModified: () => void;
}

export default function TeacherView({ teacherId, activeRoomId, onActiveRoomChanged, onDataModified }: TeacherViewProps) {
  // State variables synchronized with mock local databases
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [wheelConfig, setWheelConfig] = useState<LuckyWheelItemConfig[]>([]);

  // Room forms states
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [subjectName, setSubjectName] = useState('Tin học');
  const [targetClass, setTargetClass] = useState(() => db.getClasses()[0] || '10A1');
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomDesc, setEditRoomDesc] = useState('');
  
  // Custom student Excel/CSV text enrollment state
  const [bulkStudents, setBulkStudents] = useState(
    "Đào Quốc Anh, anh.dao@test.com\nNguyễn Minh Khang, khang.nguyen@test.com\n"
  );
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);

  // Manual individual student enrollment states
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentEmail, setManualStudentEmail] = useState('');
  const [manualStudentPassword, setManualStudentPassword] = useState('password123');
  const [showManualEnroll, setShowManualEnroll] = useState(false);

  // Classroom quick-XP tweaks
  const [xpTweakAmount, setXpTweakAmount] = useState(10);
  const [goldTweakAmount, setGoldTweakAmount] = useState(10);

  // Quest Creating matrix state
  const [questTitle, setQuestTitle] = useState('');
  const [questDesc, setQuestDesc] = useState('');
  const [questType, setQuestType] = useState<'quiz' | 'file'>('quiz');
  const [rewardXp, setRewardXp] = useState(100);
  const [rewardGold, setRewardGold] = useState(50);
  const [penaltyXp, setPenaltyXp] = useState(30);
  const [deadlineDate, setDeadlineDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const getTomorrowDateString = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Sub-Quiz state builder
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    questionText: string;
    options: string[];
    correctOptionIndex: number;
  }>>([
    {
      questionText: 'Thẻ <p> trong lập trình HTML dùng để hiển thị nội dung nào?',
      options: ['Hình ảnh', 'Đoạn văn bản', 'Đường siêu liên kết', 'Bảng biểu dữ liệu'],
      correctOptionIndex: 1
    }
  ]);

  // Force local DB refresh from storage cache
  const loadDbState = () => {
    setRooms(db.getRooms().filter(r => r.teacherId === teacherId));
    setParticipants(db.getParticipants().filter(p => p.roomId === activeRoomId));
    setUsers(db.getUsers());
    setQuests(db.getQuests().filter(q => q.roomId === activeRoomId));
    setSubmissions(db.getSubmissions());
    setWheelConfig(db.getWheelConfig());
  };

  useEffect(() => {
    loadDbState();
  }, [activeRoomId]);

  // Synchronized Audio Synthesis feedback for actions
  const playBeep = (freq: number, type: 'sine' | 'square' = 'sine', duration = 0.1) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Create customized class room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const computedRoomName = `${subjectName} - Lớp ${targetClass}`;

    const allRooms = db.getRooms();
    const generatedId = 'room-' + Math.random().toString(36).substr(2, 9);
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();

    const newRoom: Classroom = {
      id: generatedId,
      roomName: computedRoomName,
      description: newRoomDesc.trim() || `Phòng học trực tuyến môn ${subjectName} dành cho các học sinh thuộc Lớp ${targetClass}`,
      teacherId,
      inviteCode,
      createdAt: new Date().toISOString(),
      targetClass,
      subjectName
    };

    const updated = [...allRooms, newRoom];
    db.setRooms(updated);
    setNewRoomName('');
    setNewRoomDesc('');
    
    addSystemNotification(
      'Tạo phòng học mới',
      `Phòng học "${computedRoomName}" được thành lập thành công. Mã vào lớp: ${inviteCode}`,
      'success'
    );

    playBeep(440, 'sine', 0.15);
    onActiveRoomChanged(generatedId);
    onDataModified();
    loadDbState();
  };

  // Delete Room
  const handleDeleteRoom = (roomId: string) => {
    const allRooms = db.getRooms().filter(r => r.id !== roomId);
    db.setRooms(allRooms);

    // Delete participants, quests
    const remainingParticipants = db.getParticipants().filter(p => p.roomId !== roomId);
    db.setParticipants(remainingParticipants);

    const remainingQuests = db.getQuests().filter(q => q.roomId !== roomId);
    db.setQuests(remainingQuests);

    addSystemNotification(
      'Xóa phòng học',
      `Giáo viên chủ quản đã xóa vĩnh viễn phòng học ID: ${roomId}`,
      'warning'
    );

    // switch room to the next available room for this teacher
    const teacherRooms = allRooms.filter(r => r.teacherId === teacherId);
    const nextRoom = teacherRooms.length > 0 ? teacherRooms[0].id : '';

    db.setCurrentRoomId(nextRoom);
    onActiveRoomChanged(nextRoom);
    onDataModified();
    setShowDeleteConfirm(false);
    loadDbState();
    playBeep(300, 'square', 0.2);
  };

  // Start Edit Room
  const handleStartEditRoom = () => {
    const currentRoom = rooms.find(r => r.id === activeRoomId);
    if (currentRoom) {
      setEditRoomName(currentRoom.roomName);
      setEditRoomDesc(currentRoom.description || '');
      setShowEditRoom(prev => !prev);
    }
  };

  // Save Room Edit
  const handleSaveRoomEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoomName.trim()) {
      alert("Tên phòng học không được để trống!");
      return;
    }

    const allRooms = db.getRooms();
    const updated = allRooms.map(r => {
      if (r.id === activeRoomId) {
        return {
          ...r,
          roomName: editRoomName.trim(),
          description: editRoomDesc.trim()
        };
      }
      return r;
    });

    db.setRooms(updated);
    setShowEditRoom(false);

    addSystemNotification(
      'Cập nhật phòng học',
      `Thông tin phòng học được cập nhật thành công thành: "${editRoomName}"`,
      'success'
    );

    playBeep(440, 'sine', 0.1);
    onDataModified();
    loadDbState();
  };

  // Clone Classroom (Copies all quests and lucky wheel configs from active room to a brand new one)
  const handleCloneRoom = () => {
    const currentRoom = rooms.find(r => r.id === activeRoomId);
    if (!currentRoom) return;

    const allRooms = db.getRooms();
    const clonedId = 'room-clone-' + Math.random().toString(36).substr(2, 9);
    const inviteCode = 'CL' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const clonedRoom: Classroom = {
      id: clonedId,
      roomName: `${currentRoom.roomName} (Bản sao)`,
      description: `Bản sao nhân bản từ ${currentRoom.roomName}. Kho nhiệm vụ được sao chép nguyên vẹn.`,
      teacherId,
      inviteCode,
      createdAt: new Date().toISOString()
    };

    db.setRooms([...allRooms, clonedRoom]);

    // Copy Quests
    const activeQuests = db.getQuests().filter(q => q.roomId === activeRoomId);
    const clonedQuests: Quest[] = activeQuests.map(q => ({
      ...q,
      id: 'quest-clon-' + Math.random().toString(36).substr(2, 9),
      roomId: clonedId,
      createdAt: new Date().toISOString()
    }));
    db.setQuests([...db.getQuests(), ...clonedQuests]);

    // Copy participants for convenience
    const currentParts = db.getParticipants().filter(p => p.roomId === activeRoomId);
    const clonedParts: RoomParticipant[] = currentParts.map(p => ({
      ...p,
      id: 'part-clon-' + Math.random().toString(36).substr(2, 9),
      roomId: clonedId,
      joinedAt: new Date().toISOString()
    }));
    db.setParticipants([...db.getParticipants(), ...clonedParts]);

    addSystemNotification(
      'Nhân bản thành công',
      `Đã nhân bản phòng học "${currentRoom.roomName}" sang "${clonedRoom.roomName}" với ${clonedQuests.length} nhiệm vụ liên kết.`,
      'success'
    );

    playBeep(587.33, 'sine', 0.2); // D5
    onActiveRoomChanged(clonedId);
    onDataModified();
    loadDbState();
  };

  // Helper: Download a real robust format-compliant CSV template for teacher to fill easily
  const downloadCsvTemplate = () => {
    const headers = "Họ và tên,Email,Mật khẩu\n";
    const rows = [
      "Nguyễn Minh Hằng,hang.nguyen@eduquest.vn,password123",
      "Văn Quốc Dũng,dung.van@eduquest.vn,password123",
      "Phạm Thị Lan,lan.pham@eduquest.vn,password123"
    ].join("\n");
    const csvContent = "\uFEFF" + headers + rows; // Add UTF-8 BOM so Vietnamese displays correctly in Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "eduquest_phieu_nhap_hoc_sinh_mau.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addSystemNotification(
      'Tải file mẫu',
      `Tải xuống thành công biểu mẫu "eduquest_phieu_nhap_hoc_sinh_mau.csv" để điền dữ liệu.`,
      'success'
    );
    playBeep(440, 'sine', 0.1);
  };

  // Helper: Process reader of selected CSV file
  const handleCsvFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      alert("Hệ thống chỉ hỗ trợ xử lý file biểu mẫu .csv hoặc .txt!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const allUsers = db.getUsers();
      const allParticipants = db.getParticipants();
      let enrollCount = 0;

      const updatedUsers = [...allUsers];
      const updatedParticipants = [...allParticipants];

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Skip headers
        if (index === 0 && (trimmed.toLowerCase().includes('họ') || trimmed.toLowerCase().includes('name') || trimmed.toLowerCase().includes('email'))) {
          return;
        }

        const parts = trimmed.split(',');
        if (parts[0] && parts[0].trim()) {
          const name = parts[0].trim();
          const email = parts[1] ? parts[1].trim() : `student.${Math.random().toString(36).substr(2, 4)}@eduquest.vn`;
          const rawPassword = parts[2] ? parts[2].trim() : 'password123';
          const studentId = 'student-bulk-' + Math.random().toString(36).substr(2, 9);

          // Check exists user
          const existsUser = allUsers.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
          let activeId = studentId;

          if (!existsUser) {
            const newUser: User = {
              id: studentId,
              email,
              fullName: name,
              avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
              role: 'student',
              password: rawPassword,
              createdAt: new Date().toISOString()
            };
            updatedUsers.push(newUser);
          } else {
            activeId = existsUser.id;
          }

          // Add participant to the current active classroom
          const alreadyPart = allParticipants.find(p => p.studentId === activeId && p.roomId === activeRoomId);
          if (!alreadyPart) {
            const newPart: RoomParticipant = {
              id: 'part-bulk-' + Math.random().toString(36).substr(2, 9),
              roomId: activeRoomId,
              studentId: activeId,
              currentXp: 150, // default starting XP for newly added students
              currentLevel: 1,
              goldBalance: 50,
              luckySpins: 1,
              joinedAt: new Date().toISOString()
            };
            updatedParticipants.push(newPart);
            enrollCount++;
          }
        }
      });

      db.setUsers(updatedUsers);
      db.setParticipants(updatedParticipants);

      addSystemNotification(
        'Nhập file CSV',
        `Tải tệp thành công! Đã đăng ký thành viên và nhập ${enrollCount} học sinh vào lớp học qua file CSV.`,
        'success'
      );

      playBeep(480, 'sine', 0.22);
      onDataModified();
      loadDbState();
    };
    reader.readAsText(file, "UTF-8");
  };

  // Helper: Manually individual student registration inside active class
  const handleManualStudentEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentName.trim() || !manualStudentEmail.trim()) {
      alert("Vui lòng điền đầy đủ thông tin Tên và Email của học sinh!");
      return;
    }

    const email = manualStudentEmail.trim();
    const name = manualStudentName.trim();
    const password = manualStudentPassword.trim() || 'password123';

    const allUsers = db.getUsers();
    const allParticipants = db.getParticipants();

    const existsUser = allUsers.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    let studentId = '';
    const updatedUsers = [...allUsers];

    if (!existsUser) {
      studentId = 'student-man-' + Math.random().toString(36).substr(2, 9);
      const newUser: User = {
        id: studentId,
        email,
        fullName: name,
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        role: 'student',
        password,
        createdAt: new Date().toISOString()
      };
      updatedUsers.push(newUser);
      db.setUsers(updatedUsers);
    } else {
      studentId = existsUser.id;
    }

    const alreadyPart = allParticipants.find(p => p.studentId === studentId && p.roomId === activeRoomId);
    if (alreadyPart) {
      alert("Học sinh này hiện đã hoạt động trong phòng học này rồi!");
      return;
    }

    const newPart: RoomParticipant = {
      id: 'part-man-' + Math.random().toString(36).substr(2, 9),
      roomId: activeRoomId,
      studentId,
      currentXp: 150,
      currentLevel: 1,
      goldBalance: 50,
      luckySpins: 1,
      joinedAt: new Date().toISOString()
    };

    db.setParticipants([...allParticipants, newPart]);
    
    setManualStudentName('');
    setManualStudentEmail('');
    setManualStudentPassword('password123');
    setShowManualEnroll(false);

    addSystemNotification(
      'Thêm học sinh thủ công',
      `Đã khởi tạo tài khoản và ghi danh học sinh [${name}] vào phòng học thành công.`,
      'success'
    );

    playBeep(480, 'sine', 0.15);
    onDataModified();
    loadDbState();
  };

  // Excel / CSV lines importer simulation that expands student users and classroom participants
  const handleBulkEnroll = () => {
    if (!bulkStudents.trim()) return;

    const lines = bulkStudents.split('\n');
    const allUsers = db.getUsers();
    const allParticipants = db.getParticipants();
    let enrollCount = 0;

    const updatedUsers = [...allUsers];
    const updatedParticipants = [...allParticipants];

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts[0] && parts[0].trim()) {
        const name = parts[0].trim();
        const email = parts[1] ? parts[1].trim() : `student.${Math.random().toString(36).substr(2, 4)}@eduquest.vn`;
        const studentId = 'student-bulk-' + Math.random().toString(36).substr(2, 9);

        // 1. Double check exists
        const existsUser = allUsers.find(u => u.email === email);
        let activeId = studentId;
        
        if (!existsUser) {
          const newUser: User = {
            id: studentId,
            email,
            fullName: name,
            avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
            role: 'student',
            createdAt: new Date().toISOString()
          };
          updatedUsers.push(newUser);
        } else {
          activeId = existsUser.id;
        }

        // 2. Add to class room participants
        const alreadyPart = allParticipants.find(p => p.studentId === activeId && p.roomId === activeRoomId);
        if (!alreadyPart) {
          const newPart: RoomParticipant = {
            id: 'part-bulk-' + Math.random().toString(36).substr(2, 9),
            roomId: activeRoomId,
            studentId: activeId,
            currentXp: 150, // default onboarding XP
            currentLevel: 1,
            goldBalance: 50,
            luckySpins: 1,
            joinedAt: new Date().toISOString()
          };
          updatedParticipants.push(newPart);
          enrollCount++;
        }
      }
    });

    db.setUsers(updatedUsers);
    db.setParticipants(updatedParticipants);
    setBulkStudents('');
    setShowBulkEnroll(false);

    addSystemNotification(
      'Import danh sách',
      `Đã ghi nhận và nhập thành công thêm ${enrollCount} học sinh mới vào lớp thông qua Excel dán văn bản.`,
      'success'
    );

    playBeep(480, 'sine', 0.2);
    onDataModified();
    loadDbState();
  };

  // Quick tweak Points trigger [+ Điểm] or [- Điểm]
  const adjustStudentScore = (studentId: string, type: 'add' | 'subtract') => {
    const list = db.getParticipants();
    const targetIdx = list.findIndex(p => p.studentId === studentId && p.roomId === activeRoomId);
    if (targetIdx === -1) return;

    const studentUser = db.getUsers().find(u => u.id === studentId);
    let xpChange = type === 'add' ? xpTweakAmount : -xpTweakAmount;
    let goldChange = type === 'add' ? goldTweakAmount : -goldTweakAmount;

    // Apply adjustments
    const oldXp = list[targetIdx].currentXp;
    const newXp = Math.max(0, oldXp + xpChange);
    list[targetIdx].currentXp = newXp;
    list[targetIdx].goldBalance = Math.max(0, list[targetIdx].goldBalance + goldChange);

    // Monitor for automated level up thresholds!
    const oldLevel = list[targetIdx].currentLevel;
    const { level: computedLevel } = getLevelInfo(newXp);

    if (computedLevel > oldLevel) {
      // Level Up! Calculate rewards bonus spins
      let awardedSpins = 1;
      if (computedLevel >= 16) awardedSpins = 3;
      else if (computedLevel >= 6) awardedSpins = 2;

      list[targetIdx].currentLevel = computedLevel;
      list[targetIdx].luckySpins += awardedSpins;

      // Drop auto award higher level pass cards if gold level
      if (computedLevel >= 16) {
        const inventory = db.getInventory();
        inventory.push({
          id: 'inv-grade-' + Math.random().toString(36).substr(2, 9),
          roomId: activeRoomId,
          studentId,
          itemType: 'free_pass_voucher',
          itemName: 'Thẻ Miễn Bài Tập Cao Cấp (Bậc Thầy)',
          description: 'Hàng quà tặng đặc quyền tối cao tự thăng cấp 16+ ban tặng.',
          status: 'unused',
          acquiredAt: new Date().toISOString()
        });
        db.setInventory(inventory);
      }

      // alert audio
      playBeep(880, 'sine', 0.3);
      addSystemNotification(
        'Thăng cấp tự động! 🌟',
        `Học sinh [${studentUser?.fullName}] đột phá lên Cấp ${computedLevel}! Thưởng thêm +${awardedSpins} lượt quay may mắn.`,
        'level_up'
      );
    } else if (computedLevel < oldLevel) {
      list[targetIdx].currentLevel = computedLevel;
    }

    db.setParticipants(list);
    playChimeTweak(type);
    onDataModified();
    loadDbState();
  };

  const playChimeTweak = (type: 'add' | 'subtract') => {
    if (type === 'add') {
      playBeep(659.25, 'sine', 0.1); // E5
      setTimeout(() => playBeep(783.99, 'sine', 0.15), 80); // G5
    } else {
      playBeep(329.63, 'square', 0.15); // E4
    }
  };

  // Add question to builder bank
  const addQuizQuestionToForm = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        questionImage: '',
        optionImages: ['', '', '', '']
      }
    ]);
  };

  // Remove builder question
  const removeQuizQuestionFromForm = (idx: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  // Handle Quiz question option changes
  const updateQuizFormQuestion = (qIdx: number, text: string) => {
    const updated = [...quizQuestions];
    updated[qIdx].questionText = text;
    setQuizQuestions(updated);
  };

  const updateQuizFormOption = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...quizQuestions];
    updated[qIdx].options[optIdx] = text;
    setQuizQuestions(updated);
  };

  const updateQuizFormCorrect = (qIdx: number, correctIdx: number) => {
    const updated = [...quizQuestions];
    updated[qIdx].correctOptionIndex = correctIdx;
    setQuizQuestions(updated);
  };

  const updateQuizFormImage = (qIdx: number, text: string) => {
    const updated = [...quizQuestions];
    updated[qIdx].questionImage = text;
    setQuizQuestions(updated);
  };

  const updateQuizFormOptionImage = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...quizQuestions];
    if (!updated[qIdx].optionImages) {
      updated[qIdx].optionImages = ['', '', '', ''];
    }
    updated[qIdx].optionImages![optIdx] = text;
    setQuizQuestions(updated);
  };

  const handleImageUploadForQuestion = (qIdx: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      updateQuizFormImage(qIdx, result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUploadForOption = (qIdx: number, optIdx: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      updateQuizFormOptionImage(qIdx, optIdx, result);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadQuizTemplate = () => {
    const template = [
      {
        questionText: "Nút bấm nào trong Scratch dùng để bắt đầu chạy chương trình?",
        questionImage: "https://images.unsplash.com/photo-1618005198143-e528346d9a59?w=500",
        options: [
          "Lá cờ màu xanh",
          "Nút tròn màu đỏ",
          "Nút Space (Khoảng trắng)",
          "Nút Enter"
        ],
        correctOptionIndex: 0,
        optionImages: [
          "https://images.unsplash.com/photo-1618005198143-e528346d9a59?w=100&q=50",
          "",
          "",
          ""
        ]
      },
      {
        questionText: "Lệnh lặp 'repeat 10' nằm trong danh mục nào dưới đây?",
        questionImage: "",
        options: [
          "Motion (Di chuyển)",
          "Looks (Hiển thị)",
          "Control (Điều khiển)",
          "Sensing (Cảm biến)"
        ],
        correctOptionIndex: 2,
        optionImages: [
          "",
          "",
          "",
          ""
        ]
      }
    ];

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "bieu_mau_cau_hoi_trac_nghiem.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    playBeep(523.25, 'sine', 0.1);
  };

  const handleImportQuizTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          alert("Lỗi: Định dạng file biểu mẫu phải là một mảng các câu hỏi!");
          return;
        }

        const validated = parsed.map((item, index) => {
          if (typeof item.questionText !== 'string') {
            throw new Error(`Câu hỏi thứ ${index + 1} thiếu nội dung "questionText" hợp lệ.`);
          }
          if (!Array.isArray(item.options) || item.options.length < 2) {
            throw new Error(`Câu hỏi thứ ${index + 1} cần có mảng "options" ít nhất 2 đáp án.`);
          }
          const correctIdx = typeof item.correctOptionIndex === 'number' ? item.correctOptionIndex : 0;
          
          return {
            questionText: item.questionText,
            options: item.options.map((o: any) => String(o)),
            correctOptionIndex: correctIdx >= 0 && correctIdx < item.options.length ? correctIdx : 0,
            questionImage: typeof item.questionImage === 'string' ? item.questionImage : '',
            optionImages: Array.isArray(item.optionImages) 
              ? item.optionImages.map((img: any) => typeof img === 'string' ? img : '') 
              : ['', '', '', '']
          };
        });

        if (validated.length === 0) {
          alert("Không tìm thấy câu hỏi nào trong file!");
          return;
        }

        setQuizQuestions(validated);
        
        addSystemNotification(
          'Nhập câu hỏi thành công',
          `Đã tải ${validated.length} câu hỏi mới từ file biểu mẫu thành công!`,
          'success'
        );

        playBeep(659.25, 'sine', 0.15);
      } catch (err: any) {
        alert("Lỗi khi đọc file câu hỏi: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Deploy Quest / Assignment Form Submission
  const handleDeployQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questTitle.trim() || !questDesc.trim()) {
      alert('Vui lòng điền tiêu đề và mô tả!');
      return;
    }

    // Check if the selected date is valid (greater than current date)
    const chosen = new Date(deadlineDate);
    const chosenDateOnly = new Date(chosen.getFullYear(), chosen.getMonth(), chosen.getDate());
    
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (chosenDateOnly.getTime() <= todayDateOnly.getTime()) {
      alert("Hạn chót phải lớn hơn ngày hiện tại!");
      return;
    }

    const calculatedDeadline = new Date(deadlineDate + 'T23:59:59');

    const activeGlobalQuests = db.getQuests();
    const newQuestId = 'quest-' + Math.random().toString(36).substr(2, 9);

    const newQuest: Quest = {
      id: newQuestId,
      roomId: activeRoomId,
      title: questTitle.trim(),
      description: questDesc.trim(),
      questType: questType,
      rewardXp: rewardXp,
      rewardGold: rewardGold,
      penaltyXp: penaltyXp,
      deadline: calculatedDeadline.toISOString(),
      createdAt: new Date().toISOString(),
      ...(questType === 'quiz' ? { quizData: quizQuestions } : {})
    };

    db.setQuests([...activeGlobalQuests, newQuest]);
    
    // reset form fields
    setQuestTitle('');
    setQuestDesc('');
    setDeadlineDate(getTomorrowDateString());
    setRewardXp(100);
    setRewardGold(50);
    setPenaltyXp(30);

    addSystemNotification(
      'Nhiệm vụ mới!',
      `Đã phát hành nhiệm vụ "${questTitle.trim()}" hình thức [${questType === 'quiz' ? 'Trắc nghiệm' : 'Nộp ảnh/tài liệu'}]. Thưởng: ${rewardXp} XP.`,
      'info'
    );

    playBeep(523.25, 'sine', 0.2); // C5
    onDataModified();
    loadDbState();
  };

  // Sliders handler to modify wheel item configurations
  const handleSliderChange = (id: string, newVal: number) => {
    const backup = [...wheelConfig];
    const index = backup.findIndex(w => w.id === id);
    if (index === -1) return;

    backup[index].probability = newVal;
    setWheelConfig(backup);
  };

  const saveWheelProbabilities = () => {
    // Check if absolute sum exceeds 100%
    const total = wheelConfig.reduce((acc, c) => acc + c.probability, 0);
    if (total !== 100) {
      if (confirm(`Tổng xác suất hiện tại là ${total}%, không khớp 100% chuẩn. Bạn có muốn tự động chuẩn hóa tỷ lệ chia đều không?`)) {
        const normalized = wheelConfig.map(w => ({
          ...w,
          probability: Math.round((w.probability / total) * 100)
        }));
        
        // ensure exactly 100 on rounded errors
        const currentSum = normalized.reduce((acc, c) => acc + c.probability, 0);
        if (currentSum !== 100) {
          normalized[0].probability += (100 - currentSum);
        }

        db.setWheelConfig(normalized);
        setWheelConfig(normalized);
        alert("Đã chuẩn hóa thành công về chuẩn 100%!");
      } else {
        return;
      }
    } else {
      db.setWheelConfig(wheelConfig);
      alert("Đã lưu thiết lập vòng quay may mắn thành công!");
    }

    addSystemNotification(
      'Cấu hình tỷ lệ',
      'Giáo viên đã cập nhật lại bảng xác suất quay trúng của Vòng quay may mắn.',
      'info'
    );
    
    playBeep(440, 'sine', 0.1);
    onDataModified();
    loadDbState();
  };

  // Quick student lookups
  const enrolledStudents = participants.map(p => {
    const user = users.find(u => u.id === p.studentId);
    return {
      ...p,
      fullName: user?.fullName || 'Học sinh mới',
      email: user?.email || '',
      avatarUrl: user?.avatarUrl || ''
    };
  });

  if (rooms.length === 0) {
    return (
      <div className="space-y-8 select-none max-w-xl mx-auto py-12 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 space-y-6 shadow-xl">
          <BookOpen className="w-16 h-16 mx-auto text-emerald-500 animate-pulse" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-100">Chào Mừng Giáo Viên Mới!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Bạn chưa thành lập phòng học nào. Vui lòng sử dụng biểu mẫu bên dưới để tạo phòng tin học/học tập của riêng bạn, sau đó thêm học sinh thủ công hoặc qua file Excel/CSV!
            </p>
          </div>
          
          <div className="border-t border-slate-800/80 pt-6 max-w-md mx-auto">
            <h4 className="text-xs font-bold text-emerald-400 mb-4 tracking-wider uppercase">THÀNH LẬP PHÒNG HỌC MỚI CHI TIẾT</h4>
            <form onSubmit={handleCreateRoom} className="space-y-4 text-left font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Môn học giảng dạy *
                </label>
                <select 
                  value={subjectName} 
                  onChange={e => setSubjectName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium" 
                  required
                >
                  <option value="Toán học">Toán học (Mathematics)</option>
                  <option value="Vật lý">Vật lý (Physics)</option>
                  <option value="Hóa học">Hóa học (Chemistry)</option>
                  <option value="Tin học">Tin học (Informatics)</option>
                  <option value="Sinh học">Sinh học (Biology)</option>
                  <option value="Tiếng Anh">Tiếng Anh (English)</option>
                  <option value="Ngữ văn">Ngữ văn (Literature)</option>
                  <option value="Lịch sử">Lịch sử (History)</option>
                  <option value="Địa lý">Địa lý (Geography)</option>
                  <option value="Công nghệ">Công nghệ (Technology)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Lớp học tham gia *
                </label>
                <select 
                  value={targetClass} 
                  onChange={e => setTargetClass(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer" 
                  required
                >
                  {db.getClasses().map(cls => (
                    <option key={cls} value={cls}>Lớp {cls}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Chỉ những học sinh được Admin xếp vào Lớp này mới được quyền tham gia phòng tự động.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Mô tả chi tiết phòng học (Tùy chọn)
                </label>
                <textarea 
                  value={newRoomDesc} 
                  onChange={e => setNewRoomDesc(e.target.value)}
                  placeholder="Mô tả các chủ đề, phần thưởng thi đua học tập hoặc cấp bậc của phòng này..." 
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 resize-none h-20" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wider transition uppercase"
              >
                Thành Lập Lớp
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* 1. ROOM MANAGER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left selector card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Tổng Quan Phòng Học Chủ Quản
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Giáo viên quản trị nội dung phòng học, phân phối điểm số và cấu hình gamification
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartEditRoom}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition cursor-pointer"
                title="Đổi tên và mô tả phòng học"
              >
                ✏️ Đổi Tên Lớp
              </button>
              <button
                onClick={handleCloneRoom}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                title="Nhân bản toàn bộ Quests và vòng xoay sang một lớp học mới"
              >
                <Copy className="w-3.5 h-3.5 text-yellow-400" />
                Nhân Bản Lớp
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(prev => !prev);
                  setShowEditRoom(false);
                }}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  showDeleteConfirm
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border-rose-500/20'
                }`}
                title="Xóa vĩnh viễn phòng học"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Edit Room Form if active */}
          {showEditRoom && (
            <form onSubmit={handleSaveRoomEdit} className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 animate-fade-in text-left">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>✏️ CHI TIẾT ĐỔI TÊN & MÔ TẢ PHÒNG HỌC</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Tên Phòng Học *</label>
                  <input
                    type="text"
                    value={editRoomName}
                    onChange={e => setEditRoomName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Mô tả Phòng học</label>
                  <input
                    type="text"
                    value={editRoomDesc}
                    onChange={e => setEditRoomDesc(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditRoom(false)}
                  className="px-3 py-1 bg-slate-850 hover:bg-slate-800 text-xs text-slate-300 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold rounded-lg shadow transition cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}

          {/* Delete Room Confirmation Modal-alike Panel */}
          {showDeleteConfirm && (
            <div className="mb-6 p-5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-4 animate-fade-in text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-10 h-10 text-rose-500 shrink-0" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-rose-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                    <span>⚠️ CẢNH BÁO XÓA PHÒNG HỌC</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bạn có chắc chắn muốn xóa vĩnh viễn phòng học <strong className="text-rose-300 font-bold">"{rooms.find(r => r.id === activeRoomId)?.roomName}"</strong> chứ?
                  </p>
                  <p className="text-[11px] text-rose-400/90 leading-relaxed">
                    ⚠️ Hành động này sẽ xóa toàn bộ danh sách học sinh, các nhiệm vụ đã giao, lịch sử quay số và bảng điểm của phòng này. Hành động này KHÔNG THỂ hoàn tác!
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-rose-500/10">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(activeRoomId)}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold rounded-lg shadow transition cursor-pointer"
                >
                  Xác Nhận Xóa Vĩnh Viễn
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rooms.map(r => {
              const countParts = db.getParticipants().filter(p => p.roomId === r.id).length;
              const countQuests = db.getQuests().filter(q => q.roomId === r.id).length;
              const isActive = r.id === activeRoomId;

              return (
                <div 
                  key={r.id}
                  onClick={() => onActiveRoomChanged(r.id)}
                  className={`p-4 rounded-xl cursor-pointer transition flex flex-col justify-between border ${
                    isActive 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-100 truncate">{r.roomName}</h4>
                      <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded-full">
                        Code: {r.inviteCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 h-8">{r.description || 'Không có mô tả'}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/55 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {countParts} Học sinh
                    </span>
                    <span className="font-mono">
                      {countQuests} Nhiệm vụ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right classroom creator card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5 mb-4">
            <Plus className="w-4 h-4 text-emerald-400" />
            Tạo Phòng Học Mới
          </h3>

          <form onSubmit={handleCreateRoom} className="space-y-4 font-sans text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Môn học giảng dạy *</label>
              <select 
                value={subjectName} 
                onChange={e => setSubjectName(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
              >
                <option value="Toán học">Toán học (Mathematics)</option>
                <option value="Vật lý">Vật lý (Physics)</option>
                <option value="Hóa học">Hóa học (Chemistry)</option>
                <option value="Tin học">Tin học (Informatics)</option>
                <option value="Sinh học">Sinh học (Biology)</option>
                <option value="Tiếng Anh">Tiếng Anh (English)</option>
                <option value="Ngữ văn">Ngữ văn (Literature)</option>
                <option value="Lịch sử">Lịch sử (History)</option>
                <option value="Địa lý">Địa lý (Geography)</option>
                <option value="Công nghệ">Công nghệ (Technology)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Lớp học tham gia *</label>
              <select 
                value={targetClass} 
                onChange={e => setTargetClass(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {db.getClasses().map(cls => (
                  <option key={cls} value={cls}>Lớp {cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mô tả chi tiết (Tùy chọn)</label>
              <textarea 
                placeholder="Mô tả tóm lược môn và mục tiêu lớp học..."
                value={newRoomDesc}
                onChange={e => setNewRoomDesc(e.target.value)}
                rows={3}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wider transition uppercase cursor-pointer"
            >
              Thành Lập Lớp
            </button>
          </form>
        </div>
      </div>

      {/* 2. ENROLLED STUDENTS & EXCEL IMPORT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Bảng Học Viên Lớp Học ({enrolledStudents.length} học sinh)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Quản lý danh sách học sinh tích hợp: thêm thủ công, tải biểu mẫu nhập học và tải lên file Excel/CSV nhanh
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Template Download Button */}
            <button
              onClick={downloadCsvTemplate}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 hover:text-emerald-400 text-xs font-bold text-slate-300 border border-slate-700 rounded-lg flex items-center gap-1 transition cursor-pointer"
              title="Tải xuống tệp CSV biểu mẫu mẫu để nhập Excel chính xác"
            >
              📥 Tải Biều Mẫu CSV
            </button>

            {/* Individual Manual Add Student Trigger */}
            <button
              onClick={() => {
                setShowManualEnroll(!showManualEnroll);
                setShowBulkEnroll(false);
              }}
              className={`px-3 py-1.5 text-xs font-bold border rounded-lg flex items-center gap-1 transition cursor-pointer ${
                showManualEnroll 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
              }`}
            >
              ➕ Thêm Học Sinh Thủ Công
            </button>

            {/* Excel / Bulk Import Trigger */}
            <button
              onClick={() => {
                setShowBulkEnroll(!showBulkEnroll);
                setShowManualEnroll(false);
              }}
              className={`px-3 py-1.5 text-xs font-bold border rounded-lg flex items-center gap-1 transition cursor-pointer ${
                showBulkEnroll 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Nhập Từ Excel/CSV File
            </button>
          </div>
        </div>

        {/* Dynamic score tweaking configures values */}
        <div className="bg-slate-950 border border-slate-800/70 rounded-xl p-4 mb-6 flex flex-wrap gap-6 items-center">
          <span className="text-xs font-bold text-slate-300">Cấu hình lượng điểm điều chỉnh nhanh:</span>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">XP:</span>
            <input 
              type="number" 
              value={xpTweakAmount} 
              onChange={e => setXpTweakAmount(Number(e.target.value))}
              className="w-16 text-center text-xs bg-slate-900 border border-slate-800 rounded py-1 px-1.5 text-amber-400 font-bold"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Vàng:</span>
            <input 
              type="number" 
              value={goldTweakAmount} 
              onChange={e => setGoldTweakAmount(Number(e.target.value))}
              className="w-16 text-center text-xs bg-slate-900 border border-slate-800 rounded py-1 px-1.5 text-yellow-400 font-bold"
            />
          </div>
          
          <p className="text-[10px] text-slate-500 italic">
            * Mỗi lần bấm nút ➕ hoặc ➖ tại học sinh, hệ thống sẽ tự động bù/trừ lượng XP/Vàng này!
          </p>
        </div>

        {/* Manual individual enrollment panel */}
        {showManualEnroll && (
          <form onSubmit={handleManualStudentEnrollSubmit} className="bg-slate-950 border border-slate-800 p-5 rounded-xl mb-6 shadow-md animate-fade-in space-y-4">
            <h4 className="text-sm font-bold text-slate-200">➕ Đăng Ký Học Sinh Thủ Công Vào Lớp</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Họ và tên học sinh *
                </label>
                <input
                  type="text"
                  value={manualStudentName}
                  onChange={e => setManualStudentName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Minh Khang"
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Email liên hệ *
                </label>
                <input
                  type="email"
                  value={manualStudentEmail}
                  onChange={e => setManualStudentEmail(e.target.value)}
                  placeholder="Ví dụ: khang.nguyen@gmail.com"
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Mật khẩu đăng nhập (Mặc định: password123)
                </label>
                <input
                  type="text"
                  value={manualStudentPassword}
                  onChange={e => setManualStudentPassword(e.target.value)}
                  placeholder="Mặc định: password123"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualEnroll(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-md transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-md shadow transition cursor-pointer"
              >
                Ghi Danh Học Sinh
              </button>
            </div>
          </form>
        )}

        {/* Bulk Enroll Sheet Paste Row & FILE UPLOAD Panel */}
        {showBulkEnroll && (
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl mb-6 shadow-md animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Import Danh Sách Học Sinh Bằng File Excel/CSV Hoặc Văn Bản</h4>
                <p className="text-[11px] text-slate-400">Tải tệp tin CSV mẫu của bạn lên, hoặc dán dữ liệu thô vào khung bên dưới</p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ví dụ: Tên, Email, Mật khẩu (Một dòng mỗi bạn)</span>
            </div>

            {/* REAL FILE UPLOAD FIELD */}
            <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-xl space-y-2 text-center">
              <span className="text-xs font-bold text-slate-300 block">Chọn tệp CSV / Excel mẫu để tải lên:</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvFileLoad}
                className="text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer inline-block max-w-full"
              />
              <p className="text-[10px] text-slate-500">
                💡 Lưu ý: Hệ thống hỗ trợ xử lý mượt mà file `.csv` chuẩn tách nhau bằng dấu phẩy (Có UTF-8 BOM hiển thị rõ tiếng Việt).
              </p>
            </div>

            <div className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-wider">
              -- HOẶC DÁN DỮ LIỆU THÔ VÀO ĐÂY --
            </div>
            
            <textarea
              value={bulkStudents}
              onChange={e => setBulkStudents(e.target.value)}
              rows={4}
              placeholder="Nguyễn Văn A, nguyenwana@example.com, password123&#10;Trần Thị B, tranthib@example.com, password123"
              className="w-full text-xs font-mono p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-xs rounded transition"
              >
                📥 Tải File Excel/CSV Mẫu Lại
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkEnroll(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-705 text-xs font-semibold text-slate-300 rounded-md transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleBulkEnroll}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-md shadow transition"
                >
                  Xác Nhận Import Thô
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Students scoreboard list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                <th className="py-3 px-4">Ảnh đại diện</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Email liên hệ</th>
                <th className="py-3 px-4 text-center">Cấp độ</th>
                <th className="py-3 px-4 text-right">XP</th>
                <th className="py-3 px-4 text-right">Tiền Vàng</th>
                <th className="py-3 px-4 text-center">Spins</th>
                <th className="py-3 px-4 text-center">Hành Động Nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 text-xs">
              {enrolledStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-900/30 transition">
                  <td className="py-3.5 px-4">
                    <img 
                      src={student.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${student.fullName}`} 
                      alt="" 
                      className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{student.fullName}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{student.email}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 bg-slate-800 rounded-full font-bold text-yellow-500">
                      Lvl {student.currentLevel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-500">{student.currentXp}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-yellow-400">{student.goldBalance} 🪙</td>
                  <td className="py-3.5 px-4 text-center font-mono text-cyan-400">{student.luckySpins}</td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => adjustStudentScore(student.studentId, 'add')}
                        className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded font-semibold text-xs transition flex items-center gap-1"
                        title={`Cộng thưởng +${xpTweakAmount} XP & +${goldTweakAmount} Vàng`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Thưởng
                      </button>
                      <button
                        onClick={() => adjustStudentScore(student.studentId, 'subtract')}
                        className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded font-semibold text-xs transition flex items-center gap-1"
                        title={`Trừ điểm phạt hành vi -${xpTweakAmount} XP & -${goldTweakAmount} Vàng`}
                      >
                        <MinusCircle className="w-3.5 h-3.5" /> Phạt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {enrolledStudents.length === 0 && (
            <div className="text-center py-8 text-slate-500 italic">
              Không có học sinh trong phòng học này. Tạo học sinh hoặc dán import danh sách bằng Excel ở phía trên!
            </div>
          )}
        </div>
      </div>

      {/* 3. QUEST CREATOR MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          Ma Trận Phát Hành Nhiệm Vụ (Quest Creator)
        </h2>
        <p className="text-xs text-slate-400 mb-6 pb-4 border-b border-slate-800">
          Chỉ định thử thách bài tập, lựa chọn thang thưởng/phạt tự động và thiết kế bảng câu hỏi trắc nghiệm tự chấm điểm.
        </p>

        <form onSubmit={handleDeployQuest} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column basic parameters */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tiêu đề nhiệm vụ *</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Lắp ráp bánh răng truyền lực, Lập trình vòng lặp Scratch..."
                  value={questTitle}
                  onChange={e => setQuestTitle(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Yêu cầu chi tiết bài tập *</label>
                <textarea 
                  placeholder="Mô tả cụ thể từng bước hướng dẫn và kết quả đầu ra mong đợi..."
                  value={questDesc}
                  onChange={e => setQuestDesc(e.target.value)}
                  required
                  rows={4}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Hình thức nộp bài</label>
                  <select
                    value={questType}
                    onChange={e => setQuestType(e.target.value as 'quiz' | 'file')}
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                  >
                    <option value="quiz">Trắc nghiệm (Tự chấm)</option>
                    <option value="file">Nộp File / Ảnh Chụp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Hạn chót (Chọn ngày)
                  </label>
                  <input
                    type="date"
                    value={deadlineDate}
                    min={getTomorrowDateString()}
                    onChange={e => setDeadlineDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Right Column game rewards configuration */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-wider text-slate-300 uppercase">Cấu hình thang điểm game hóa</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">Thưởng kinh nghiệm</span>
                  <input 
                    type="number" 
                    value={rewardXp} 
                    onChange={e => setRewardXp(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">XP</span>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">Thưởng tiền vàng</span>
                  <input 
                    type="number" 
                    value={rewardGold} 
                    onChange={e => setRewardGold(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-sm font-mono font-bold text-yellow-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">GOLD</span>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1 flex items-center justify-center gap-0.5 text-rose-400">
                    <AlertTriangle className="w-3 h-3" /> Phạt trễ hạn
                  </span>
                  <input 
                    type="number" 
                    value={penaltyXp} 
                    onChange={e => setPenaltyXp(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-sm font-mono font-bold text-rose-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">XP</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                <p>💡 <strong className="text-slate-300">Tính năng thông minh:</strong></p>
                <p>• Trắc nghiệm sẽ tự so đáp án khách quan khi học sinh làm xong.</p>
                <p>• Phạt trễ hạn tự quét giảm điểm qua tác vụ Cron 00:00 ngầm.</p>
              </div>

              {/* Quiz specific questions builder panel */}
              {questType === 'quiz' && (
                <div className="space-y-3">
                  {/* Import/Export Template Tools */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap gap-2.5 items-center justify-between">
                    <div className="text-left">
                      <span className="font-bold text-[10px] text-emerald-400 block tracking-wide font-mono uppercase">QUẢN LÝ BIỂU MẪU CÂU HỎI TRẮC NGHIỆM</span>
                      <span className="text-[9px] text-slate-400 block leading-tight">Sử dụng file JSON cấu trúc chuẩn mực để nạp câu hỏi và ảnh hàng loạt</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadQuizTemplate}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-705 text-slate-300 hover:text-slate-100 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Tải tệp mẫu câu hỏi trắc nghiệm dưới dạng tệp tin JSON"
                      >
                        📥 Tải Mẫu
                      </button>
                      <label className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm">
                        📤 Nhập File JSON
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportQuizTemplate}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="border border-slate-800/80 bg-slate-950 rounded-xl p-4 max-h-[360px] overflow-y-auto space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-300">Bộ Câu Hỏi Trắc Nghiệm ({quizQuestions.length})</span>
                      <button
                        type="button"
                        onClick={addQuizQuestionToForm}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
                      </button>
                    </div>

                    {quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-3 pb-4 border-b border-slate-900 last:border-0 text-xs text-left">
                        <div className="flex justify-between gap-2">
                          <span className="text-emerald-400 font-mono font-bold text-[11px]">Câu hỏi #{qIdx+1}</span>
                          {quizQuestions.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeQuizQuestionFromForm(qIdx)}
                              className="text-rose-400 hover:text-rose-300 text-[10px]"
                            >
                              Xóa câu hỏi
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Nội dung câu hỏi của lớp..."
                            value={q.questionText}
                            onChange={e => updateQuizFormQuestion(qIdx, e.target.value)}
                            className="w-full text-xs p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-100"
                            required
                          />
                          {/* Question image link & file upload */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              placeholder="URL ảnh câu hỏi (Tùy chọn)"
                              value={q.questionImage || ''}
                              onChange={e => updateQuizFormImage(qIdx, e.target.value)}
                              className="text-[10px] p-1 bg-slate-900 border border-slate-800/80 rounded text-slate-300 focus:outline-none focus:border-cyan-500"
                            />
                            <div className="flex gap-1.5 items-center">
                              <label className="px-2 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] rounded cursor-pointer leading-none text-center flex-1 font-semibold truncate border border-slate-750/50">
                                📁 {q.questionImage ? 'Có ảnh ✓' : 'Tải ảnh thiết bị'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={e => handleImageUploadForQuestion(qIdx, e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                              </label>
                              {q.questionImage && (
                                <button
                                  type="button"
                                  onClick={() => updateQuizFormImage(qIdx, '')}
                                  className="text-rose-400 hover:text-rose-300 text-[10px] px-1"
                                  title="Xóa ảnh"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                          {q.questionImage && (
                            <div className="flex items-center justify-start gap-2 p-1 border border-slate-900 bg-slate-900/40 rounded max-w-min">
                              <img src={q.questionImage} className="h-10 w-auto rounded object-contain border border-slate-800" referrerPolicy="no-referrer" alt="preview" />
                              <span className="text-[8px] text-slate-500 font-mono">Xem thử</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-1 border-t border-slate-900/30">
                          {q.options.map((opt, optIdx) => {
                            const optImg = q.optionImages?.[optIdx] || '';
                            return (
                              <div key={optIdx} className="p-2 bg-slate-900/45 border border-slate-850 rounded-lg space-y-1">
                                <div className="flex gap-1 items-center">
                                  <input 
                                    type="radio" 
                                    name={`correct_${qIdx}`}
                                    checked={q.correctOptionIndex === optIdx}
                                    onChange={() => updateQuizFormCorrect(qIdx, optIdx)}
                                    className="accent-emerald-500"
                                  />
                                  <input 
                                    type="text" 
                                    placeholder={`Đáp án ${optIdx+1}`}
                                    value={opt}
                                    onChange={e => updateQuizFormOption(qIdx, optIdx, e.target.value)}
                                    className="w-full text-[11px] p-1 bg-slate-900 border border-slate-800/50 rounded text-slate-200"
                                    required
                                  />
                                </div>
                                {/* Option image path & upload */}
                                <div className="flex gap-1 items-center pl-4">
                                  <input 
                                    type="text" 
                                    placeholder="Ảnh đáp án (Tùy chọn)"
                                    value={optImg}
                                    onChange={e => updateQuizFormOptionImage(qIdx, optIdx, e.target.value)}
                                    className="text-[9px] p-0.5 bg-slate-950 border border-slate-900 rounded text-slate-400 focus:outline-none flex-1"
                                  />
                                  <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] px-1 py-0.5 rounded cursor-pointer shrink-0 border border-slate-700">
                                    🖼️ file
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={e => handleImageUploadForOption(qIdx, optIdx, e.target.files?.[0] || null)}
                                      className="hidden"
                                    />
                                  </label>
                                  {optImg && (
                                    <button
                                      type="button"
                                      onClick={() => updateQuizFormOptionImage(qIdx, optIdx, '')}
                                      className="text-rose-400 hover:text-rose-300 text-[9px]"
                                      title="Xóa"
                                    >
                                      ❌
                                    </button>
                                  )}
                                </div>
                                {optImg && (
                                  <div className="pl-4 flex items-center gap-1.5">
                                    <img src={optImg} className="h-6 w-6 rounded object-cover border border-slate-800" referrerPolicy="no-referrer" alt="preview choice" />
                                    <span className="text-[8px] text-slate-500 font-mono">Xem trước ảnh đáp án</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition shadow-md"
            >
              Phát Hành Thử Thách Ngay
            </button>
          </div>
        </form>
      </div>

      {/* 4. LUCKY WHEEL percentages sliders control */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-yellow-500" />
              Thiết Lập Tỷ Lệ Vòng Quay May Mắn
            </h2>
            <p className="text-xs text-slate-400 mt-1">Điều chỉnh xác suất trúng từng thẻ hoặc vàng của học sinh khi thăng cấp quay thưởng</p>
          </div>
          
          <button
            onClick={saveWheelProbabilities}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition uppercase"
          >
            <Save className="w-4 h-4" />
            Lưu Tỷ Lệ
          </button>
        </div>

        {/* Status sum */}
        <div className="mb-6 p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">Yêu cầu cân bàng tổng tỷ lệ:</span>
          <span className={`font-bold py-0.5 px-2.5 rounded-full ${
            wheelConfig.reduce((acc, c) => acc + c.probability, 0) === 100 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-rose-500/10 text-rose-400 animate-pulse'
          }`}>
            Tổng xác suất: {wheelConfig.reduce((acc, c) => acc + c.probability, 0)}% / 100%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wheelConfig.map(wheel => {
            return (
              <div key={wheel.id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: wheel.color }} />
                    <span className="text-xs font-bold text-slate-100">{wheel.itemName}</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-cyan-400">{wheel.probability}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-mono">0%</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="60" 
                    step="5"
                    value={wheel.probability} 
                    onChange={e => handleSliderChange(wheel.id, Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">60%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{wheel.rewardText}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
