document.addEventListener('DOMContentLoaded', () => {
    const goalInput = document.getElementById('goal-input');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const goalsContainer = document.getElementById('goals-container');
    const frequencySelect = document.getElementById('frequency-select');

    // Basit tarih yardımcıları
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseDate = (dateStr) => {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    const getToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    };

    let goals = [];
    
    // LocalStorage'dan hedefleri yükle
    const loadGoals = () => {
        try {
            const stored = localStorage.getItem('goals');
            if (stored) {
                goals = JSON.parse(stored).map(goal => ({
                    name: goal.name || 'İsimsiz Hedef',
                    completed: goal.completed || [],
                    color: goal.color || getRandomColor(),
                    frequency: parseInt(goal.frequency) || 1,
                    startDate: goal.startDate || formatDate(getToday())
                }));
            }
        } catch (e) {
            console.error('Hedefler yüklenemedi:', e);
            goals = [];
        }
    };

    // Hedefleri LocalStorage'a kaydet
    const saveGoals = () => {
        try {
            localStorage.setItem('goals', JSON.stringify(goals));
        } catch (e) {
            console.error('Hedefler kaydedilemedi:', e);
        }
    };

    // Rastgele renk üret
    const getRandomColor = () => {
        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // Frekans metnini al
    const getFrequencyText = (frequency) => {
        switch (frequency) {
            case 1: return 'Her Gün';
            case 2: return '2 Günde Bir';
            case 3: return '3 Günde Bir';
            case 7: return 'Haftada Bir';
            default: return `${frequency} Günde Bir`;
        }
    };

    // Günün gerekli olup olmadığını kontrol et
    const isRequiredDay = (date, startDate, frequency) => {
        const daysDiff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff % frequency === 0;
    };

    // Seri hesapla
    const calculateStreak = (goal) => {
        if (!goal.completed || goal.completed.length === 0) {
            return 0;
        }

        const today = getToday();
        const startDate = parseDate(goal.startDate);
        const frequency = goal.frequency;
        const completedDates = new Set(goal.completed);

        let streak = 0;
        let currentDate = new Date(today);

        // Bugün gerekli mi ve tamamlandı mı kontrol et
        const isTodayRequired = isRequiredDay(today, startDate, frequency);
        const isTodayCompleted = completedDates.has(formatDate(today));

        // Eğer bugün gerekli ama tamamlanmadıysa, dünden başla
        if (isTodayRequired && !isTodayCompleted) {
            currentDate.setDate(currentDate.getDate() - 1);
        }

        // Geriye doğru giderek seriyi hesapla
        while (currentDate >= startDate) {
            const dateStr = formatDate(currentDate);
            const isRequired = isRequiredDay(currentDate, startDate, frequency);

            if (isRequired) {
                if (completedDates.has(dateStr)) {
                    streak++;
                } else {
                    break; // Seri kırıldı
                }
            }

            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    };

    // Hedefleri render et
    const renderGoals = () => {
        goalsContainer.innerHTML = '';
        
        if (goals.length === 0) {
            goalsContainer.innerHTML = '<p class="text-center text-gray-500">Henüz bir hedef eklemediniz.</p>';
            return;
        }

        goals.forEach((goal, goalIndex) => {
            const goalElement = document.createElement('div');
            goalElement.style.backgroundColor = goal.color;
            goalElement.className = 'p-4 rounded-lg shadow-lg text-white';

            const today = getToday();
            const startDate = parseDate(goal.startDate);
            const completedDates = new Set(goal.completed);

            // Takvim günlerini oluştur - başlangıç tarihinden bugüne kadar
            const days = [];
            const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
            
            // Başlangıç tarihinden 30 gün ilerisine kadar göster
            const startDisplayDate = new Date(startDate);
            const endDisplayDate = new Date(today);
            endDisplayDate.setDate(today.getDate() + 30); // 30 gün ilerisini göster
            
            let currentDisplayDate = new Date(startDisplayDate);
            
            while (currentDisplayDate <= endDisplayDate) {
                const dateStr = formatDate(currentDisplayDate);
                const isCompleted = completedDates.has(dateStr);
                const isFuture = currentDisplayDate > today;
                const isRequired = isRequiredDay(currentDisplayDate, startDate, goal.frequency);

                let className = 'bg-gray-300';
                if (isCompleted) {
                    className = 'bg-green-500';
                } else if (!isFuture && isRequired) {
                    className = 'bg-red-400';
                } else if (isRequired) {
                    className = 'bg-blue-200';
                }

                days.push({
                    date: new Date(currentDisplayDate),
                    dateStr: dateStr,
                    dayNum: currentDisplayDate.getDate(),
                    dayName: currentDisplayDate.toLocaleDateString('tr-TR', { weekday: 'short' }),
                    isCompleted: isCompleted,
                    isFuture: isFuture,
                    isRequired: isRequired,
                    className: className
                });
                
                currentDisplayDate.setDate(currentDisplayDate.getDate() + 1);
            }

            const streak = calculateStreak(goal);

            const calendarHtml = days.map(day => `
                <div class="text-center flex-shrink-0">
                    <div class="text-xs">${day.dayName}</div>
                    <div class="font-bold text-base">${day.dayNum}</div>
                    <div 
                        class="day-marker w-7 h-7 mx-auto rounded-full cursor-pointer flex items-center justify-center ${day.className} ${day.isFuture ? 'opacity-50 cursor-not-allowed' : ''}"
                        data-goal-index="${goalIndex}"
                        data-date="${day.dateStr}"
                        title="${day.isRequired ? 'Gerekli Gün' : 'Opsiyonel Gün'}"
                        ${day.isFuture ? 'disabled' : ''}
                    >
                        ${day.isCompleted ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                    </div>
                </div>
            `).join('');

            goalElement.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-grow">
                        <h3 class="text-xl font-bold">${goal.name}</h3>
                        <p class="text-xs opacity-80">${getFrequencyText(goal.frequency)} - Seri: ${streak} Adım</p>
                    </div>
                    <div>
                        <button class="edit-goal-btn text-white mr-2" data-index="${goalIndex}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-goal-btn text-white" data-index="${goalIndex}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto pb-2">
                    <div class="flex space-x-2 min-w-max">
                        ${calendarHtml}
                    </div>
                </div>
            `;

            goalsContainer.appendChild(goalElement);
        });
    };

    // Yeni hedef ekle
    addGoalBtn.addEventListener('click', () => {
        const goalName = goalInput.value.trim();
        if (goalName) {
            goals.push({
                name: goalName,
                completed: [],
                color: getRandomColor(),
                frequency: parseInt(frequencySelect.value),
                startDate: formatDate(getToday())
            });
            goalInput.value = '';
            saveGoals();
            renderGoals();
        }
    });

    // Enter tuşu ile hedef ekle
    goalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addGoalBtn.click();
        }
    });

    // Hedef işlemleri
    goalsContainer.addEventListener('click', (e) => {
        // Gün işaretleme
        if (e.target.closest('.day-marker') && !e.target.closest('.day-marker').hasAttribute('disabled')) {
            const dayMarker = e.target.closest('.day-marker');
            const goalIndex = parseInt(dayMarker.dataset.goalIndex);
            const dateStr = dayMarker.dataset.date;
            
            const goal = goals[goalIndex];
            if (!goal) return;

            const completedIndex = goal.completed.indexOf(dateStr);
            
            if (completedIndex > -1) {
                goal.completed.splice(completedIndex, 1);
            } else {
                goal.completed.push(dateStr);
            }

            saveGoals();
            renderGoals();
        }

        // Hedef silme
        if (e.target.closest('.delete-goal-btn')) {
            const goalIndex = parseInt(e.target.closest('.delete-goal-btn').dataset.index);
            if (confirm('Bu hedefi silmek istediğinizden emin misiniz?')) {
                goals.splice(goalIndex, 1);
                saveGoals();
                renderGoals();
            }
        }
        
        // Hedef düzenleme
        if (e.target.closest('.edit-goal-btn')) {
            const goalIndex = parseInt(e.target.closest('.edit-goal-btn').dataset.index);
            const newName = prompt('Yeni hedef adını girin:', goals[goalIndex].name);
            if (newName && newName.trim() !== '') {
                goals[goalIndex].name = newName.trim();
                saveGoals();
                renderGoals();
            }
        }
    });

    // Başlangıç
    loadGoals();
    renderGoals();
}); 