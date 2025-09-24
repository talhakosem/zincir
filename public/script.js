document.addEventListener('DOMContentLoaded', () => {
    // Service Worker kayıt
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(registration => console.log('Service Worker kayıt edildi:', registration))
            .catch(error => console.log('Service Worker kayıt hatası:', error));
    }

    // Dark mode functionality
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    
    // Load dark mode preference from localStorage
    const loadDarkModePreference = () => {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            body.classList.add('dark');
            document.documentElement.classList.add('dark');
            updateDarkModeIcon(true);
        } else {
            body.classList.remove('dark');
            document.documentElement.classList.remove('dark');
            updateDarkModeIcon(false);
        }
    };
    
    // Update dark mode icon
    const updateDarkModeIcon = (isDarkMode) => {
        if (!darkModeToggle) return;
        const icon = darkModeToggle.querySelector('i');
        if (icon) {
            if (isDarkMode) {
                icon.className = 'fas fa-sun text-xl';
                darkModeToggle.title = 'Açık Mod';
            } else {
                icon.className = 'fas fa-moon text-xl';
                darkModeToggle.title = 'Karanlık Mod';
            }
        }
    };
    
    // Toggle dark mode
    const toggleDarkMode = () => {
        const isDarkMode = body.classList.contains('dark');
        console.log('Current dark mode state:', isDarkMode); // Debug log
        
        if (isDarkMode) {
            body.classList.remove('dark');
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
            updateDarkModeIcon(false);
            console.log('Switched to light mode'); // Debug log
        } else {
            body.classList.add('dark');
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
            updateDarkModeIcon(true);
            console.log('Switched to dark mode'); // Debug log
        }
    };
    
    // Initialize dark mode
    loadDarkModePreference();
    
    // Add event listener for dark mode toggle
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }

    const goalInput = document.getElementById('goal-input');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const goalsContainer = document.getElementById('goals-container');
    const frequencySelect = document.getElementById('frequency-select');

    // Bildirim izni kontrol ve isteme
    const checkNotificationPermission = async () => {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    showNotification('Zinciri Kırma', 'Bildirimler aktif! Hedeflerini takip etmeyi unutma.', 'success');
                }
            }
        }
    };

    // Bildirim gösterme fonksiyonu
    const showNotification = (title, body, type = 'info') => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const icon = type === 'success' ? '✅' : type === 'reminder' ? '⏰' : '📋';
            const notification = new Notification(title, {
                body: body,
                icon: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">${icon}</text></svg>`,
                badge: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">🎯</text></svg>`,
                tag: 'zinciri-kirma',
                requireInteraction: type === 'reminder'
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), type === 'reminder' ? 30000 : 5000);
        }
    };

    // Hatırlatıcı ayarlarını yükle/kaydet
    const loadReminderSettings = () => {
        const settings = localStorage.getItem('reminderSettings');
        return settings ? JSON.parse(settings) : {
            enabled: true,
            times: ['09:00', '14:00', '20:00'],
            lastCheck: null
        };
    };

    const saveReminderSettings = (settings) => {
        localStorage.setItem('reminderSettings', JSON.stringify(settings));
    };

    // Hatırlatıcı kontrolü
    const checkReminders = () => {
        const settings = loadReminderSettings();
        if (!settings.enabled) return;

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const today = formatDate(now);

        // Bugün için kontrol edilmemiş hatırlatıcı var mı?
        settings.times.forEach(reminderTime => {
            const lastCheckKey = `lastReminder_${reminderTime}_${today}`;
            const wasChecked = localStorage.getItem(lastCheckKey);

            if (currentTime >= reminderTime && !wasChecked) {
                // Tamamlanmamış hedefleri kontrol et
                const incompleteTasks = checkIncompleteTasks();
                
                if (incompleteTasks.length > 0) {
                    const taskList = incompleteTasks.slice(0, 3).join(', ');
                    const moreText = incompleteTasks.length > 3 ? ` ve ${incompleteTasks.length - 3} hedef daha` : '';
                    
                    showNotification(
                        '⏰ Hedef Hatırlatıcısı', 
                        `Bugün için bekleyen hedeflerin var: ${taskList}${moreText}`,
                        'reminder'
                    );
                }

                // Bu hatırlatıcının bugün gösterildiğini işaretle
                localStorage.setItem(lastCheckKey, 'true');
            }
        });
    };

    // Tamamlanmamış hedefleri kontrol et
    const checkIncompleteTasks = () => {
        const today = formatDate(getToday());
        const incompleteTasks = [];

        goals.forEach(goal => {
            const activeCycle = getActiveCycle(goal);
            if (!activeCycle) return;

            const startDate = parseDate(activeCycle.startDate);
            const isRequired = isRequiredDay(getToday(), startDate, goal.frequency);
            const isCompleted = activeCycle.completed.includes(today);

            if (isRequired && !isCompleted) {
                incompleteTasks.push(goal.name);
            }
        });

        return incompleteTasks;
    };

    // Hatırlatıcı ayarları modalı
    const showReminderSettingsModal = () => {
        const settings = loadReminderSettings();
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full transition-colors">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800 dark:text-white">Hatırlatıcı Ayarları</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="mb-4">
                    <label class="flex items-center">
                        <input type="checkbox" id="reminder-enabled" ${settings.enabled ? 'checked' : ''} class="mr-2">
                        <span class="font-semibold text-gray-800 dark:text-white">Hatırlatıcıları Aktif Et</span>
                    </label>
                </div>
                
                <div class="mb-4">
                    <p class="font-semibold mb-2 text-gray-800 dark:text-white">Hatırlatma Saatleri:</p>
                    <div id="reminder-times" class="space-y-2">
                        ${settings.times.map((time, index) => `
                            <div class="flex items-center gap-2">
                                <input type="time" value="${time}" class="reminder-time p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded transition-colors" data-index="${index}">
                                <button class="remove-time text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" data-index="${index}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="add-time mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold">
                        <i class="fas fa-plus"></i> Yeni Saat Ekle
                    </button>
                </div>
                
                <div class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                        <i class="fas fa-info-circle text-yellow-600 dark:text-yellow-400"></i>
                        Hatırlatıcılar sadece bu sayfa açıkken çalışır. Daha güçlü bildirimler için sayfayı yer imlerine ekleyip sık sık ziyaret edin.
                    </p>
                </div>
                
                <button class="save-settings bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors w-full">
                    Ayarları Kaydet
                </button>
            </div>
        `;

        // Event listeners
        const addTimeBtn = modal.querySelector('.add-time');
        addTimeBtn.addEventListener('click', () => {
            const timesContainer = modal.querySelector('#reminder-times');
            const newIndex = timesContainer.children.length;
            const newTimeDiv = document.createElement('div');
            newTimeDiv.className = 'flex items-center gap-2';
            newTimeDiv.innerHTML = `
                <input type="time" value="12:00" class="reminder-time p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded transition-colors" data-index="${newIndex}">
                <button class="remove-time text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" data-index="${newIndex}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            timesContainer.appendChild(newTimeDiv);
        });

        modal.addEventListener('click', (e) => {
            if (e.target.closest('.remove-time')) {
                e.target.closest('.flex').remove();
            }
        });

        const saveBtn = modal.querySelector('.save-settings');
        saveBtn.addEventListener('click', () => {
            const enabled = modal.querySelector('#reminder-enabled').checked;
            const times = Array.from(modal.querySelectorAll('.reminder-time')).map(input => input.value);
            
            saveReminderSettings({ enabled, times, lastCheck: null });
            modal.remove();
            
            if (enabled && Notification.permission === 'default') {
                checkNotificationPermission();
            }
            
            showNotification('Ayarlar Kaydedildi', 'Hatırlatıcı ayarlarınız güncellendi.', 'success');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.close-modal')) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
    };

    // Sayfa odaklanma kontrolü
    let reminderInterval;
    
    const startReminderCheck = () => {
        // Her dakika kontrol et
        reminderInterval = setInterval(checkReminders, 60000);
        // İlk kontrol
        checkReminders();
    };

    const stopReminderCheck = () => {
        if (reminderInterval) {
            clearInterval(reminderInterval);
        }
    };

    // Sayfa görünür olduğunda kontrol başlat
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopReminderCheck();
        } else {
            startReminderCheck();
        }
    });

    // Ödül önerileri listesi (30 adet)
    const rewardSuggestions = [
        "Sevdiğin bir kitabı satın al",
        "Favori kafende özel bir kahve iç",
        "Sinema bileti al ve film izle",
        "Masaj randevusu al",
        "Yeni bir müzik albümü dinle",
        "Doğada uzun bir yürüyüş yap",
        "En sevdiğin yemeği sipariş et",
        "Küçük bir bitki satın al",
        "Güzel bir mum al ve rahatla",
        "Yeni bir hobi malzemesi al",
        "Spa günü planla",
        "Arkadaşlarınla buluş",
        "Yeni bir parfüm dene",
        "Fotoğraf çekimi yap",
        "Online bir kursa kayıt ol",
        "Konsere veya tiyatroya git",
        "Kendine çiçek al",
        "Lüks bir banyo köpüğüyle banyo yap",
        "Meditasyon veya yoga seansı",
        "Yeni bir oyun satın al",
        "Sanat malzemesi al ve resim yap",
        "Güzel bir dergi satın al",
        "Bisiklet turu yap",
        "Yeni bir çay çeşidi dene",
        "Kendine güzel bir not defteri al",
        "Müzeyi ziyaret et",
        "Yemek yapma atölyesine katıl",
        "Podcast veya sesli kitap dinle",
        "Güneşin doğuşunu veya batışını izle",
        "Kendine özel bir hediye paketi hazırla"
    ];

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
    
    // LocalStorage'dan hedefleri yükle - yeni yapı ile
    const loadGoals = () => {
        try {
            const stored = localStorage.getItem('goals');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Eski formattan yeni formata geçiş için kontrol
                if (Array.isArray(parsed)) {
                    // Eski format - yeni formata çevir
                    goals = parsed.map(goal => ({
                        name: goal.name || 'İsimsiz Hedef',
                        color: goal.color || getRandomColor(),
                        frequency: parseInt(goal.frequency) || 1,
                        createdDate: goal.startDate || formatDate(getToday()),
                        cycles: [{
                            startDate: goal.startDate || formatDate(getToday()),
                            endDate: null,
                            completed: goal.completed || [],
                            active: true
                        }],
                        history: [],
                        rewards: [],
                        lastRewardCheck: 0
                    }));
                } else {
                    goals = parsed.goals || [];
                    // Ödül sistemi için güncelleme
                    goals = goals.map(goal => ({
                        ...goal,
                        rewards: goal.rewards || [],
                        lastRewardCheck: goal.lastRewardCheck || 0
                    }));
                }
            }
        } catch (e) {
            console.error('Hedefler yüklenemedi:', e);
            goals = [];
        }
    };

    // Hedefleri LocalStorage'a kaydet - yeni yapı ile
    const saveGoals = () => {
        try {
            localStorage.setItem('goals', JSON.stringify({ goals, lastUpdated: formatDate(getToday()) }));
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

    // Aktif döngüyü al
    const getActiveCycle = (goal) => {
        return goal.cycles.find(cycle => cycle.active);
    };

    // Döngü istatistiklerini hesapla
    const calculateCycleStats = (cycle, frequency) => {
        if (!cycle.completed || cycle.completed.length === 0) {
            return { completed: 0, required: 0, percentage: 0 };
        }

        const startDate = parseDate(cycle.startDate);
        const endDate = cycle.endDate ? parseDate(cycle.endDate) : getToday();
        const completedDates = new Set(cycle.completed);

        let requiredDays = 0;
        let completedDays = 0;
        let current = new Date(startDate);

        while (current <= endDate) {
            if (isRequiredDay(current, startDate, frequency)) {
                requiredDays++;
                if (completedDates.has(formatDate(current))) {
                    completedDays++;
                }
            }
            current.setDate(current.getDate() + 1);
        }

        return {
            completed: completedDays,
            required: requiredDays,
            percentage: requiredDays > 0 ? Math.round((completedDays / requiredDays) * 100) : 0
        };
    };

    // Seri hesapla
    const calculateStreak = (goal) => {
        const activeCycle = getActiveCycle(goal);
        if (!activeCycle || !activeCycle.completed || activeCycle.completed.length === 0) {
            return 0;
        }

        const today = getToday();
        const startDate = parseDate(activeCycle.startDate);
        const frequency = goal.frequency;
        const completedDates = new Set(activeCycle.completed);

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

    // Ödül kontrolü ve gösterimi
    const checkAndShowReward = (goalIndex) => {
        const goal = goals[goalIndex];
        const streak = calculateStreak(goal);
        
        // Her 10 günde bir ödül
        if (streak > 0 && streak % 10 === 0 && streak > goal.lastRewardCheck) {
            goal.lastRewardCheck = streak;
            const randomReward = rewardSuggestions[Math.floor(Math.random() * rewardSuggestions.length)];
            
            // Ödül modalını göster
            showRewardModal(goalIndex, randomReward, streak);
            
            // Ödülü kaydet
            goal.rewards.push({
                date: formatDate(getToday()),
                streak: streak,
                suggestion: randomReward,
                completed: false,
                notes: ''
            });
            
            saveGoals();
        }
    };

    // Ödül modalını göster
    const showRewardModal = (goalIndex, rewardSuggestion, streak) => {
        const goal = goals[goalIndex];
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md w-full text-center reward-modal transition-colors">
                <div class="mb-6">
                    <i class="fas fa-gift text-6xl text-yellow-500 mb-4"></i>
                    <h2 class="text-3xl font-bold text-gray-800 dark:text-white mb-2">Tebrikler! 🎉</h2>
                    <p class="text-xl text-gray-600 dark:text-gray-300">${goal.name} hedefinde ${streak} günlük seriye ulaştın!</p>
                </div>
                
                <div class="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Kendine Ödül Zamanı!</h3>
                    <p class="text-lg text-gray-700 dark:text-gray-300 italic">"${rewardSuggestion}"</p>
                </div>
                
                <p class="text-gray-600 dark:text-gray-300 mb-6">Bu ödülü hak ettin! Kendine bu güzel şeyi yap ve motivasyonunu yüksek tut.</p>
                
                <button class="bg-yellow-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors close-modal">
                    Harika, Yapacağım!
                </button>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.close-modal')) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
        
        // Konfeti efekti için
        createConfetti();
    };

    // Konfeti efekti
    const createConfetti = () => {
        const colors = ['#FFC700', '#FF0080', '#00FF00', '#00FFFF', '#FF00FF'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.opacity = '1';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.style.transition = 'all 3s ease-out';
            confetti.style.zIndex = '9999';
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.style.top = '100%';
                confetti.style.opacity = '0';
                confetti.style.transform = `rotate(${Math.random() * 720}deg) translateX(${Math.random() * 200 - 100}px)`;
            }, 10);
            
            setTimeout(() => confetti.remove(), 3000);
        }
    };

    // Ödül geçmişini göster
    const showRewardHistory = (goalIndex) => {
        const goal = goals[goalIndex];
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        let rewardsContent = '';
        if (goal.rewards.length === 0) {
            rewardsContent = '<p class="text-gray-500 dark:text-gray-400">Henüz kazanılmış ödül yok. 10 günlük seriye ulaştığında ilk ödülün seni bekliyor!</p>';
        } else {
            rewardsContent = goal.rewards.reverse().map((reward, index) => `
                <div class="border-b border-gray-200 dark:border-gray-600 pb-4 mb-4 last:border-b-0">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-semibold text-gray-800 dark:text-white">${reward.streak} Günlük Seri Ödülü</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-300">${parseDate(reward.date).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <span class="reward-status px-3 py-1 rounded-full text-xs font-semibold ${
                            reward.completed ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        }">
                            ${reward.completed ? 'Yapıldı' : 'Bekliyor'}
                        </span>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 italic mb-2">"${reward.suggestion}"</p>
                    ${reward.notes ? `<p class="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">💭 ${reward.notes}</p>` : ''}
                    ${!reward.completed ? `
                        <button class="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold complete-reward-btn" 
                                data-goal-index="${goalIndex}" data-reward-index="${goal.rewards.length - 1 - index}">
                            Ödülü Değerlendir
                        </button>
                    ` : ''}
                </div>
            `).join('');
        }
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto transition-colors">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800 dark:text-white">${goal.name} - Ödül Geçmişi</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${rewardsContent}
            </div>
        `;
        
        // Ödül değerlendirme butonlarına event listener ekle
        modal.querySelectorAll('.complete-reward-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rewardIndex = parseInt(e.target.dataset.rewardIndex);
                modal.remove();
                showRewardEvaluationModal(goalIndex, rewardIndex);
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.close-modal')) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    };

    // Ödül değerlendirme modalı
    const showRewardEvaluationModal = (goalIndex, rewardIndex) => {
        const goal = goals[goalIndex];
        const reward = goal.rewards[rewardIndex];
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full transition-colors">
                <h3 class="text-xl font-bold mb-4 text-gray-800 dark:text-white">Ödül Değerlendirmesi</h3>
                <p class="text-gray-700 dark:text-gray-300 mb-4">Önerilen ödül: <span class="font-semibold italic">"${reward.suggestion}"</span></p>
                
                <div class="mb-4">
                    <label class="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Bu ödülü yaptın mı?</label>
                    <div class="flex gap-4">
                        <label class="flex items-center">
                            <input type="radio" name="completed" value="yes" class="mr-2">
                            <span class="text-gray-800 dark:text-white">Evet, yaptım! 🎉</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="completed" value="no" class="mr-2">
                            <span class="text-gray-800 dark:text-white">Henüz yapmadım</span>
                        </label>
                    </div>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Düşüncelerin ve deneyimin:</label>
                    <textarea 
                        id="reward-notes" 
                        class="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        rows="4"
                        placeholder="Bu ödül hakkında ne düşünüyorsun? Nasıl hissettirdi? Seni mutlu etti mi?"
                    ></textarea>
                </div>
                
                <div class="flex gap-2">
                    <button class="save-evaluation bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                        Kaydet
                    </button>
                    <button class="close-modal bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors">
                        İptal
                    </button>
                </div>
            </div>
        `;
        
        const saveBtn = modal.querySelector('.save-evaluation');
        saveBtn.addEventListener('click', () => {
            const completed = modal.querySelector('input[name="completed"]:checked');
            const notes = modal.querySelector('#reward-notes').value;
            
            if (completed && notes.trim()) {
                reward.completed = completed.value === 'yes';
                reward.notes = notes.trim();
                saveGoals();
                modal.remove();
                showRewardHistory(goalIndex);
            } else {
                alert('Lütfen tüm alanları doldurun!');
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.close-modal')) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    };

    // Yeni döngü başlat
    const startNewCycle = (goalIndex) => {
        const goal = goals[goalIndex];
        const activeCycle = getActiveCycle(goal);
        
        if (activeCycle) {
            // Mevcut döngüyü kapat
            activeCycle.endDate = formatDate(getToday());
            activeCycle.active = false;
            
            // İstatistikleri hesapla ve geçmişe ekle
            const stats = calculateCycleStats(activeCycle, goal.frequency);
            goal.history.push({
                ...activeCycle,
                stats
            });
        }
        
        // Yeni döngü başlat
        goal.cycles.push({
            startDate: formatDate(getToday()),
            endDate: null,
            completed: [],
            active: true
        });
        
        // Ödül sayacını sıfırla
        goal.lastRewardCheck = 0;
        
        saveGoals();
        renderGoals();
    };

    // Hedefleri render et
    const renderGoals = () => {
        goalsContainer.innerHTML = '';
        
        if (goals.length === 0) {
            goalsContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Henüz bir hedef eklemediniz.</p>';
            return;
        }

        goals.forEach((goal, goalIndex) => {
            const goalElement = document.createElement('div');
            goalElement.style.backgroundColor = goal.color;
            goalElement.className = 'p-4 rounded-lg shadow-lg text-white relative overflow-hidden';

            const activeCycle = getActiveCycle(goal);
            if (!activeCycle) return;

            const today = getToday();
            const startDate = parseDate(activeCycle.startDate);
            const completedDates = new Set(activeCycle.completed);

            // Döngü günlerini hesapla
            const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
            const currentCycleDay = daysSinceStart + 1;

            // Takvim günlerini oluştur
            const days = [];
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
            const cycleStats = calculateCycleStats(activeCycle, goal.frequency);

            // Başarı yüzdesi arka plan efekti
            const successBar = `
                <div class="absolute top-0 left-0 h-full bg-white bg-opacity-10" style="width: ${cycleStats.percentage}%; transition: width 1s ease-out;"></div>
            `;

            // Zincir bağlantılarını hesapla
            const connectedDays = new Set();
            let hasConnections = false;
            
            for (let i = 0; i < days.length - 1; i++) {
                const currentDay = days[i];
                const nextDay = days[i + 1];
                
                // Eğer mevcut gün ve sonraki gün tamamlanmışsa ve ardışıksa
                if (currentDay.isCompleted && nextDay.isCompleted && 
                    currentDay.isRequired && nextDay.isRequired) {
                    connectedDays.add(i);
                    hasConnections = true;
                }
            }

            const calendarHtml = days.map((day, index) => {
                const isConnected = connectedDays.has(index);
                const connectionClass = isConnected ? 'connected' : '';
                
                return `
                    <div class="text-center flex-shrink-0">
                        <div class="text-xs">${day.dayName}</div>
                        <div class="font-bold text-base">${day.dayNum}</div>
                        <div 
                            class="day-marker w-7 h-7 mx-auto rounded-full cursor-pointer flex items-center justify-center ${day.className} ${connectionClass} ${day.isFuture ? 'opacity-50 cursor-not-allowed' : ''}"
                            data-goal-index="${goalIndex}"
                            data-date="${day.dateStr}"
                            title="${day.isRequired ? 'Gerekli Gün' : 'Opsiyonel Gün'}${isConnected ? ' - Zincir Bağlantılı' : ''}"
                            ${day.isFuture ? 'disabled' : ''}
                        >
                            ${day.isCompleted ? '<i class="fas fa-link text-white text-xs chain-icon"></i>' : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Geçmiş döngü sayısı
            const totalCycles = goal.history.length + 1;
            const pendingRewards = goal.rewards.filter(r => !r.completed).length;

            goalElement.innerHTML = `
                ${successBar}
                <div class="relative z-10">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-grow">
                            <h3 class="text-xl font-bold">${goal.name}</h3>
                            <p class="text-xs opacity-80">${getFrequencyText(goal.frequency)} - Seri: ${streak} Adım</p>
                            <p class="text-xs opacity-80">Döngü ${totalCycles} - Gün ${currentCycleDay}</p>
                            <div class="mt-2">
                                <div class="text-2xl font-bold">%${cycleStats.percentage}</div>
                                <div class="text-xs opacity-80">Başarı Oranı</div>
                            </div>
                        </div>
                        <div>
                            ${pendingRewards > 0 ? `
                                <button class="reward-history-btn text-yellow-300 mr-2 relative" data-index="${goalIndex}" title="Ödüller">
                                    <i class="fas fa-gift"></i>
                                    <span class="absolute -top-1 -right-1 bg-yellow-300 text-gray-800 text-xs rounded-full w-4 h-4 flex items-center justify-center">${pendingRewards}</span>
                                </button>
                            ` : `
                                <button class="reward-history-btn text-white mr-2" data-index="${goalIndex}" title="Ödüller">
                                    <i class="fas fa-gift"></i>
                                </button>
                            `}
                            <button class="new-cycle-btn text-white mr-2" data-index="${goalIndex}" title="Yeni Döngü Başlat">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="history-btn text-white mr-2" data-index="${goalIndex}" title="Geçmiş">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="edit-goal-btn text-white mr-2" data-index="${goalIndex}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-goal-btn text-white" data-index="${goalIndex}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto pb-2">
                        <div class="flex space-x-2 min-w-max chain-container ${hasConnections ? 'has-connections' : ''}">
                            ${calendarHtml}
                        </div>
                    </div>
                    <div class="mt-3 text-xs opacity-80">
                        <div class="flex justify-between">
                            <span>Tamamlanan: ${cycleStats.completed}/${cycleStats.required}</span>
                            <span>Başlangıç: ${startDate.toLocaleDateString('tr-TR')}</span>
                        </div>
                    </div>
                </div>
            `;

            goalsContainer.appendChild(goalElement);
        });
    };

    // Geçmiş modalını göster
    const showHistoryModal = (goalIndex) => {
        const goal = goals[goalIndex];
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        let historyContent = '';
        if (goal.history.length === 0) {
            historyContent = '<p class="text-gray-500 dark:text-gray-400">Henüz tamamlanmış döngü yok.</p>';
        } else {
            historyContent = goal.history.map((cycle, index) => {
                const startDate = parseDate(cycle.startDate);
                const endDate = parseDate(cycle.endDate);
                const duration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                
                return `
                    <div class="border-b border-gray-200 dark:border-gray-600 pb-3 mb-3">
                        <h4 class="font-semibold text-gray-800 dark:text-white">Döngü ${index + 1}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-300">
                            ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')} 
                            (${duration} gün)
                        </p>
                        <p class="text-sm text-gray-700 dark:text-gray-300">
                            Başarı: %${cycle.stats.percentage} 
                            (${cycle.stats.completed}/${cycle.stats.required} gün)
                        </p>
                    </div>
                `;
            }).join('');
        }
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto transition-colors">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800 dark:text-white">${goal.name} - Geçmiş</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${historyContent}
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.close-modal')) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    };

    // Yeni hedef ekle
    addGoalBtn.addEventListener('click', () => {
        const goalName = goalInput.value.trim();
        if (goalName) {
            goals.push({
                name: goalName,
                color: getRandomColor(),
                frequency: parseInt(frequencySelect.value),
                createdDate: formatDate(getToday()),
                cycles: [{
                    startDate: formatDate(getToday()),
                    endDate: null,
                    completed: [],
                    active: true
                }],
                history: [],
                rewards: [],
                lastRewardCheck: 0
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

            const activeCycle = getActiveCycle(goal);
            if (!activeCycle) return;

            const completedIndex = activeCycle.completed.indexOf(dateStr);
            
            if (completedIndex > -1) {
                activeCycle.completed.splice(completedIndex, 1);
            } else {
                activeCycle.completed.push(dateStr);
                // Ödül kontrolü
                checkAndShowReward(goalIndex);
            }

            saveGoals();
            renderGoals();
        }

        // Ödül geçmişi
        if (e.target.closest('.reward-history-btn')) {
            const goalIndex = parseInt(e.target.closest('.reward-history-btn').dataset.index);
            showRewardHistory(goalIndex);
        }

        // Yeni döngü başlat
        if (e.target.closest('.new-cycle-btn')) {
            const goalIndex = parseInt(e.target.closest('.new-cycle-btn').dataset.index);
            if (confirm('Yeni bir döngü başlatmak istediğinizden emin misiniz? Mevcut döngü kapatılacak.')) {
                startNewCycle(goalIndex);
            }
        }

        // Geçmişi göster
        if (e.target.closest('.history-btn')) {
            const goalIndex = parseInt(e.target.closest('.history-btn').dataset.index);
            showHistoryModal(goalIndex);
        }

        // Hedef silme
        if (e.target.closest('.delete-goal-btn')) {
            const goalIndex = parseInt(e.target.closest('.delete-goal-btn').dataset.index);
            if (confirm('Bu hedefi silmek istediğinizden emin misiniz? Tüm geçmiş kayıtlar da silinecek.')) {
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

        // Hatırlatıcı ayarları
        if (e.target.closest('.reminder-settings-btn')) {
            showReminderSettingsModal();
        }
    });

    // Başlangıç
    loadGoals();
    renderGoals();
    
    // Bildirim izni kontrolü ve hatırlatıcıları başlat
    checkNotificationPermission();
    startReminderCheck();
    
    // Hatırlatıcı ayarları butonu
    const reminderSettingsBtn = document.getElementById('reminder-settings-btn');
    if (reminderSettingsBtn) {
        reminderSettingsBtn.addEventListener('click', showReminderSettingsModal);
    }
}); 