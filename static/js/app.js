/**
 * Enterprise AI RAG Assistant - Master Application Controller
 * Manages core views, chat history, document uploads, live status polling, team list, and profiles.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only run if not on login page
    if (window.location.pathname.includes('/login/')) return;
    
    App.init();
});

const App = {
    currentUser: null,
    activeTab: 'chat',
    activeSessionId: null,
    allUsersList: [],
    pollingInterval: null,

    async init() {
        // Load user profile from cached local storage
        this.currentUser = AuthManager.getCachedUser();
        if (!this.currentUser) {
            // Backup check in case storage was cleared
            await AuthManager.checkAuth();
            this.currentUser = AuthManager.getCachedUser();
        }

        if (this.currentUser) {
            this.updateUserInterfaceDetails();
        }

        // Initialize Tab controls
        this.setupTabNavigation();
        
        // Phase 2: Chat components
        this.ChatController.init();

        // Phase 3 & 4: Documents components
        this.DocumentsController.init();

        // Phase 5: Team components
        this.TeamController.init();
        
        // Profile setup
        this.initProfileTab();

        // Bind global logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            AuthManager.logout();
        });
    },

    // Populate user profile info in sidebar
    updateUserInterfaceDetails() {
        const nameElements = document.querySelectorAll('.user-display-name');
        const roleElements = document.querySelectorAll('.user-display-role');
        const avatarElements = document.querySelectorAll('.user-avatar');
        
        const initial = this.currentUser.email.charAt(0).toUpperCase();
        const role = this.currentUser.role.toLowerCase();

        nameElements.forEach(el => el.textContent = this.currentUser.email.split('@')[0]);
        
        roleElements.forEach(el => {
            el.innerHTML = `<span class="badge-pill badge-${role}">${role}</span>`;
        });

        avatarElements.forEach(el => el.textContent = initial);

        // Conditional feature flags based on roles
        const isStaff = role === 'admin' || role === 'manager';
        
        // Hide team and uploader forms if standard employee/customer
        if (!isStaff) {
            const teamNavItem = document.querySelector('[data-tab="team"]');
            if (teamNavItem) teamNavItem.style.display = 'none';

            const kbTitleDesc = document.querySelector('.kb-upload-wrapper');
            if (kbTitleDesc) kbTitleDesc.style.display = 'none';
        }
    },

    // Handle tab shifts
    setupTabNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-tab]');
        const tabPanels = document.querySelectorAll('.dashboard-tab-panel');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.getAttribute('data-tab');
                
                navItems.forEach(nav => nav.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));

                item.classList.add('active');
                const targetPanel = document.getElementById(`${targetTab}Tab`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }

                this.activeTab = targetTab;
                this.handleTabActivation(targetTab);
            });
        });
    },

    handleTabActivation(tabName) {
        if (tabName === 'documents') {
            this.DocumentsController.loadDocuments();
        } else if (tabName === 'team') {
            this.TeamController.loadTeamMembers();
        } else if (tabName === 'chat') {
            this.ChatController.loadSessions();
        }
    },

    // Renders custom profile details card
    initProfileTab() {
        const emailVal = document.getElementById('profEmail');
        const roleVal = document.getElementById('profRole');
        const compVal = document.getElementById('profCompany');
        
        if (emailVal && this.currentUser) {
            emailVal.textContent = this.currentUser.email;
            roleVal.textContent = this.currentUser.role.toUpperCase();
            compVal.textContent = this.currentUser.company || 'Enterprise AI Workspace';
        }
    },

    // ==========================================
    // PHASE 2: CHAT SERVICE CONTROLLER
    // ==========================================
    ChatController: {
        sessions: [],
        
        init() {
            this.loadSessions();
            
            // New chat session button
            document.getElementById('newChatBtn').addEventListener('click', () => {
                this.createNewChatSession();
            });

            // Chat input textarea auto-resize
            const textarea = document.getElementById('chatInput');
            textarea.addEventListener('input', () => {
                textarea.style.height = '24px';
                textarea.style.height = `${Math.min(textarea.scrollHeight - 6, 160)}px`;
            });

            // Textarea enter submission guard
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.submitPromptMessage();
                }
            });

            // Send Prompt Button
            document.getElementById('sendChatBtn').addEventListener('click', () => {
                this.submitPromptMessage();
            });

            // Close RAG Citation Drawer
            document.getElementById('closeDrawerBtn').addEventListener('click', () => {
                document.getElementById('citationDrawer').classList.remove('open');
            });
        },

        // Fetch existing user sessions
        async loadSessions() {
            try {
                const response = await AuthManager.fetchWithAuth('/api/chat/sessions/');
                if (response.ok) {
                    this.sessions = await response.json();
                    this.renderSessionsList();
                }
            } catch (err) {
                console.error('Failed to load chat sessions:', err);
            }
        },

        // Render sessions in history sidebar
        renderSessionsList() {
            const listContainer = document.getElementById('chatSessionsList');
            listContainer.innerHTML = '';

            if (this.sessions.length === 0) {
                listContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:1rem;">No prior sessions.</div>';
                return;
            }

            this.sessions.forEach(sess => {
                const item = document.createElement('div');
                item.className = `session-item animate-fade-in ${App.activeSessionId === sess.id ? 'active' : ''}`;
                item.dataset.sessionId = sess.id;
                item.style.display = 'flex';
                item.style.flexDirection = 'row';
                item.style.alignItems = 'center';
                item.style.justifyContent = 'space-between';
                item.style.paddingRight = '0.5rem';
                
                const date = new Date(sess.updated_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
                
                item.innerHTML = `
                    <div class="session-item-content" style="flex-grow: 1; min-width: 0; cursor: pointer;">
                        <div class="session-item-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; font-size: 0.85rem;">${sess.title || 'Conversation'}</div>
                        <div class="session-item-date" style="font-size: 0.7rem; color: var(--text-muted);">${date}</div>
                    </div>
                    <button class="btn-delete-session" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all var(--transition-fast);" title="Delete Chat">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                `;

                // Click on sidebar body content loads session
                const content = item.querySelector('.session-item-content');
                content.addEventListener('click', () => {
                    this.loadActiveSession(sess.id);
                });

                // Click on delete button deletes session
                const deleteBtn = item.querySelector('.btn-delete-session');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteChatSession(sess.id, sess.title);
                });

                listContainer.appendChild(item);
            });
        },

        // Call backend API to delete a chat session
        async deleteChatSession(sessionId, title) {
            const check = confirm(`Are you sure you want to delete this conversation: "${title || 'Untitled'}"?`);
            if (!check) return;

            try {
                const response = await AuthManager.fetchWithAuth(`/api/chat/sessions/${sessionId}/`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    if (App.activeSessionId === sessionId) {
                        this.createNewChatSession();
                    }
                    await this.loadSessions();
                } else {
                    alert('Failed to delete chat session.');
                }
            } catch (err) {
                console.error('Error deleting chat session:', err);
                alert('Connection error trying to delete chat.');
            }
        },

        // Clear active session and reset chat panel empty state
        createNewChatSession() {
            App.activeSessionId = null;
            
            // Mark active styles off
            document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
            
            // Expose empty screen
            document.getElementById('chatPanelHeader').style.display = 'none';
            document.getElementById('chatMessagesBox').style.display = 'none';
            document.getElementById('chatInputContainer').style.display = 'block';
            document.getElementById('chatEmptyState').style.display = 'flex';
            
            const textarea = document.getElementById('chatInput');
            textarea.value = '';
            textarea.style.height = '24px';
            textarea.focus();
        },

        // Load targeted session messages
        async loadActiveSession(sessionId) {
            App.activeSessionId = sessionId;
            this.renderSessionsList();

            // Setup loading overlay state
            const messagesBox = document.getElementById('chatMessagesBox');
            messagesBox.innerHTML = '<div class="tab-loading-state"><span class="spinner"></span><p>Loading session logs...</p></div>';
            
            document.getElementById('chatEmptyState').style.display = 'none';
            document.getElementById('chatPanelHeader').style.display = 'flex';
            messagesBox.style.display = 'flex';

            try {
                const response = await AuthManager.fetchWithAuth(`/api/chat/sessions/${sessionId}/messages/`);
                if (response.ok) {
                    const messages = await response.json();
                    this.renderSessionMessages(messages);
                } else {
                    messagesBox.innerHTML = '<div class="alert alert-danger">Failed to load message history.</div>';
                }
            } catch (err) {
                messagesBox.innerHTML = '<div class="alert alert-danger">Error fetching chat logs.</div>';
            }
        },

        // Render message bubbles on box panel
        renderSessionMessages(messages) {
            const messagesBox = document.getElementById('chatMessagesBox');
            messagesBox.innerHTML = '';

            if (messages.length === 0) {
                messagesBox.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">This chat is empty.</div>';
                return;
            }

            // Render current active session title in header
            const activeSess = this.sessions.find(s => s.id === App.activeSessionId);
            if (activeSess) {
                document.getElementById('activeSessionTitle').textContent = activeSess.title;
            }

            messages.forEach(msg => {
                this.appendMessageBubble(msg.sender, msg.content, msg.citations, msg.created_at);
            });

            this.scrollToBottom();
        },

        // Create bubble card element and insert
        appendMessageBubble(sender, content, citations = null, timestamp = null) {
            const messagesBox = document.getElementById('chatMessagesBox');
            
            const row = document.createElement('div');
            row.className = `message-row ${sender === 'user' ? 'user-row' : 'assistant-row'} animate-fade-in`;
            
            const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'}) : new Date().toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
            
            // Format citation pills if available
            let citationHTML = '';
            if (citations && citations.length > 0) {
                citationHTML = '<div class="citation-list">';
                citations.forEach((cit, idx) => {
                    const sourceName = cit.document || 'Source doc';
                    const percentScore = cit.score ? Math.round(cit.score * 100) : 0;
                    
                    citationHTML += `
                        <div class="citation-pill" data-index="${idx}">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            <span>[${idx + 1}] ${sourceName} (${percentScore}%)</span>
                        </div>
                    `;
                });
                citationHTML += '</div>';
            }

            // Simple markdown parser replacement for bubbles (line breaks, bold)
            let formattedContent = content
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            row.innerHTML = `
                <div class="message-bubble">
                    <div class="message-content">${formattedContent}</div>
                    ${citationHTML}
                    <div class="message-meta">${timeStr}</div>
                </div>
            `;

            // Bind click handlers to citation pills
            if (citations && citations.length > 0) {
                const pills = row.querySelectorAll('.citation-pill');
                pills.forEach(pill => {
                    pill.addEventListener('click', () => {
                        const idx = parseInt(pill.getAttribute('data-index'));
                        this.openCitationDrawer(citations[idx]);
                    });
                });
            }

            messagesBox.appendChild(row);
        },

        // Trigger prompt delivery
        async submitPromptMessage() {
            const input = document.getElementById('chatInput');
            const promptText = input.value.trim();
            if (!promptText) return;

            // Clear input box
            input.value = '';
            input.style.height = '24px';

            // If empty state active, transition to chat view
            const isEmpty = document.getElementById('chatEmptyState').style.display !== 'none';
            if (isEmpty) {
                document.getElementById('chatEmptyState').style.display = 'none';
                document.getElementById('chatPanelHeader').style.display = 'flex';
                document.getElementById('chatMessagesBox').style.display = 'flex';
                document.getElementById('chatMessagesBox').innerHTML = '';
                document.getElementById('activeSessionTitle').textContent = promptText.substring(0, 40);
            }

            // Append User prompt locally
            this.appendMessageBubble('user', promptText);
            this.scrollToBottom();

            // Append floating Assistant loading bubble
            const loadingRow = document.createElement('div');
            loadingRow.className = 'message-row assistant-row animate-fade-in';
            loadingRow.id = 'chatLoadingBubble';
            loadingRow.innerHTML = `
                <div class="message-bubble" style="background:transparent; border:none; box-shadow:none; padding-left:0.5rem;">
                    <div class="tab-loading-state" style="flex-direction:row; height:auto; gap:0.65rem; color:var(--text-muted);">
                        <span class="spinner" style="width:14px; height:14px; border-width:1.5px; border-top-color:var(--primary);"></span>
                        <span>Retrieving documents & reasoning...</span>
                    </div>
                </div>
            `;
            document.getElementById('chatMessagesBox').appendChild(loadingRow);
            this.scrollToBottom();

            // Disable input button
            const sendBtn = document.getElementById('sendChatBtn');
            sendBtn.disabled = true;

            try {
                const response = await AuthManager.fetchWithAuth('/api/chat/ask/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        question: promptText,
                        session_id: App.activeSessionId
                    })
                });

                // Clear loader bubble
                const loader = document.getElementById('chatLoadingBubble');
                if (loader) loader.remove();

                if (response.ok) {
                    const result = await response.json();
                    
                    const isNewSession = !App.activeSessionId;
                    App.activeSessionId = result.session_id;

                    // Append real answer
                    this.appendMessageBubble('assistant', result.answer, result.sources);
                    this.scrollToBottom();

                    // Refresh side lists
                    if (isNewSession) {
                        await this.loadSessions();
                    }
                } else {
                    this.appendMessageBubble('assistant', 'Error: The server returned an unsuccessful response. Please check your service connection.');
                    this.scrollToBottom();
                }
            } catch (err) {
                // Clear loader bubble
                const loader = document.getElementById('chatLoadingBubble');
                if (loader) loader.remove();

                this.appendMessageBubble('assistant', 'Network Error: Failed to contact the AI model. Ensure local Ollama services are online.');
                this.scrollToBottom();
            } finally {
                sendBtn.disabled = false;
                input.focus();
            }
        },

        // Helper scroll to bottom container
        scrollToBottom() {
            const box = document.getElementById('chatMessagesBox');
            box.scrollTop = box.scrollHeight;
        },

        // Slide in citation side drawers
        openCitationDrawer(citation) {
            const drawer = document.getElementById('citationDrawer');
            document.getElementById('drawerDocTitle').textContent = citation.document || 'Unknown Document';
            
            const scorePercent = citation.score ? Math.round(citation.score * 100) : 0;
            document.getElementById('drawerMatchScore').textContent = `${scorePercent}%`;
            
            document.getElementById('drawerSnippetContent').textContent = citation.text || 'No snippet text returned.';
            
            drawer.classList.add('open');
        }
    },

    // ==========================================
    // PHASE 3 & 4: KNOWLEDGE BASE CONTROLLER
    // ==========================================
    DocumentsController: {
        documents: [],

        init() {
            this.setupUploader();
            
            // Re-fetch users lists if admin to populate selectors
            App.TeamController.loadUsersListPromise();
        },

        // Fetch company document models
        async loadDocuments() {
            const tableBody = document.getElementById('documentsTableBody');
            tableBody.innerHTML = '<tr><td colspan="5"><div class="tab-loading-state"><span class="spinner"></span><p>Fetching files registry...</p></div></td></tr>';

            try {
                const response = await AuthManager.fetchWithAuth('/api/documents/');
                if (response.ok) {
                    this.documents = await response.json();
                    this.renderDocumentsList();
                    this.startPollingIfNeeded();
                } else {
                    tableBody.innerHTML = '<tr><td colspan="5" style="color:var(--danger); text-align:center; padding:2rem;">Failed to retrieve document registries.</td></tr>';
                }
            } catch (err) {
                tableBody.innerHTML = '<tr><td colspan="5" style="color:var(--danger); text-align:center; padding:2rem;">Connection Error loading files.</td></tr>';
            }
        },

        // Render file registries into rows
        renderDocumentsList() {
            const tableBody = document.getElementById('documentsTableBody');
            tableBody.innerHTML = '';

            if (this.documents.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-muted);">No documents in the enterprise repository yet.</td></tr>';
                return;
            }

            const activeRole = App.currentUser.role.toLowerCase();
            const canDelete = activeRole === 'admin' || activeRole === 'manager';

            this.documents.forEach(doc => {
                const row = document.createElement('tr');
                row.className = 'animate-fade-in';
                
                const sizeFormatted = this.formatBytes(doc.file_size);
                const dateStr = new Date(doc.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
                
                // Get icons
                const type = (doc.document_type || 'txt').toLowerCase();
                let fileIcon = '📄';
                if (type === 'pdf') fileIcon = '📕';
                else if (type === 'doc' || type === 'docx') fileIcon = '📘';
                else if (type === 'csv') fileIcon = '📗';

                // Format status badges
                const status = (doc.status || 'uploaded').toLowerCase();
                let statusBadge = `<span class="status-badge status-${status}">${doc.status}</span>`;
                if (status === 'processing') {
                    statusBadge = `
                        <span class="status-badge status-processing">
                            <span class="spinner"></span>
                            <span>Indexing</span>
                        </span>
                    `;
                } else if (status === 'indexed') {
                    statusBadge = `
                        <span class="status-badge status-indexed" data-tooltip="Vectorized in Qdrant database">
                            ✓ Indexed
                        </span>
                    `;
                } else if (status === 'failed') {
                    statusBadge = `
                        <span class="status-badge status-failed" data-tooltip="Parser failed. Verify format structure.">
                            ⚠ Failed
                        </span>
                    `;
                }

                // Delete button
                let deleteHTML = '';
                if (canDelete) {
                    deleteHTML = `
                        <button class="btn-delete-doc" data-doc-id="${doc.id}" title="Remove file from indexing">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    `;
                }

                row.innerHTML = `
                    <td>
                        <div class="doc-title-cell">
                            <span class="doc-icon ${type}">${fileIcon}</span>
                            <span style="font-weight: 500;">${doc.title}</span>
                        </div>
                    </td>
                    <td><span style="text-transform:uppercase; font-size:0.75rem; background:rgba(255,255,255,0.03); padding:0.15rem 0.45rem; border-radius:4px;">${type}</span></td>
                    <td>${sizeFormatted}</td>
                    <td>${dateStr}</td>
                    <td>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            ${statusBadge}
                            ${deleteHTML}
                        </div>
                    </td>
                `;

                // Bind delete triggers
                if (canDelete) {
                    const deleteBtn = row.querySelector('.btn-delete-doc');
                    deleteBtn.addEventListener('click', () => {
                        this.triggerDocumentDeletion(doc.id, doc.title);
                    });
                }

                tableBody.appendChild(row);
            });
        },

        // Initiate file deletes
        async triggerDocumentDeletion(id, title) {
            const check = confirm(`Are you sure you want to delete and un-index "${title}" from the knowledge base?`);
            if (!check) return;

            try {
                const response = await AuthManager.fetchWithAuth(`/api/documents/${id}/`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.loadDocuments();
                } else {
                    alert('Failed to delete targeted document.');
                }
            } catch (err) {
                alert('Connection error attempting delete.');
            }
        },

        // Set up drag drop listener configurations
        setupUploader() {
            const dragArea = document.getElementById('dragDropArea');
            const fileInput = document.getElementById('fileInputHidden');
            const permBox = document.getElementById('uploadPermissionsBox');
            
            if (!dragArea) return;

            // Trigger browse prompt click
            dragArea.addEventListener('click', () => {
                fileInput.click();
            });

            // Handle drag interactions
            ['dragenter', 'dragover'].forEach(eventName => {
                dragArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    dragArea.classList.add('dragover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dragArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    dragArea.classList.remove('dragover');
                }, false);
            });

            // Handle drop files
            dragArea.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files.length > 0) {
                    this.handleFileSelected(files[0]);
                }
            });

            // Handle file input changes
            fileInput.addEventListener('change', (e) => {
                if (fileInput.files.length > 0) {
                    this.handleFileSelected(fileInput.files[0]);
                }
            });

            // Bind upload submission action button
            document.getElementById('startUploadBtn').addEventListener('click', () => {
                this.performDocumentUpload();
            });

            // Bind cancel uploading
            document.getElementById('cancelUploadBtn').addEventListener('click', () => {
                this.resetUploaderState();
            });
        },

        // Stage uploader UI once file picked
        handleFileSelected(file) {
            this.selectedFile = file;
            document.getElementById('selectedFileName').textContent = file.name;
            document.getElementById('docFormTitle').value = file.name.split('.')[0];
            
            // Hide drag-and-drop card and show configuration box
            document.getElementById('dragDropArea').style.display = 'none';
            document.getElementById('uploadPermissionsBox').classList.add('visible');

            // Show permission toggles for Staff
            const role = App.currentUser.role.toLowerCase();
            if (role === 'admin' || role === 'manager') {
                this.populateUsersSelectorDropdown();
            }
        },

        // Gather permission details & POST upload
        async performDocumentUpload() {
            if (!this.selectedFile) return;

            const title = document.getElementById('docFormTitle').value.trim();
            if (!title) {
                alert('Please enter a document title.');
                return;
            }

            const startBtn = document.getElementById('startUploadBtn');
            const cancelBtn = document.getElementById('cancelUploadBtn');
            startBtn.disabled = true;
            cancelBtn.disabled = true;
            
            const btnText = startBtn.querySelector('span:first-child');
            const btnSpinner = startBtn.querySelector('.spinner');
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-block';

            // Compile Multipart Form payload
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('title', title);

            // Phase 4: Gather multi-select permission checks
            const role = App.currentUser.role.toLowerCase();
            if (role === 'admin' || role === 'manager') {
                // Roles checks
                const roleCheckboxes = document.querySelectorAll('.upload-role-checkbox:checked');
                roleCheckboxes.forEach(cb => {
                    formData.append('roles', cb.value);
                });

                // Departments checks
                const deptCheckboxes = document.querySelectorAll('.upload-dept-checkbox:checked');
                deptCheckboxes.forEach(cb => {
                    formData.append('departments', cb.value);
                });

                // Specific users checks
                const userCheckboxes = document.querySelectorAll('.upload-user-checkbox:checked');
                userCheckboxes.forEach(cb => {
                    formData.append('specific_users', cb.value);
                });
            }

            try {
                // Authorized post
                const response = await AuthManager.fetchWithAuth('/api/documents/upload/', {
                    method: 'POST',
                    body: formData // Fetch handles proper boundary generation
                });

                if (response.ok) {
                    this.resetUploaderState();
                    await this.loadDocuments();
                } else {
                    const data = await response.json().catch(() => ({}));
                    alert(`Upload Error: ${data.detail || 'The file was rejected by the server.'}`);
                }
            } catch (err) {
                alert('Connection failure attempting upload.');
            } finally {
                startBtn.disabled = false;
                cancelBtn.disabled = false;
                btnText.style.display = 'inline';
                btnSpinner.style.display = 'none';
            }
        },

        // Clear file upload views
        resetUploaderState() {
            this.selectedFile = null;
            document.getElementById('fileInputHidden').value = '';
            document.getElementById('selectedFileName').textContent = '';
            document.getElementById('docFormTitle').value = '';

            // Show drag-and-drop card and hide configuration box
            document.getElementById('dragDropArea').style.display = 'block';
            document.getElementById('uploadPermissionsBox').classList.remove('visible');

            // Uncheck selection options except disabled/locked ones (like Manager)
            document.querySelectorAll('#uploadPermissionsBox input[type="checkbox"]:not([disabled])').forEach(cb => {
                cb.checked = false;
            });
        },

        // Phase 4 specific: populate checkboxes dropdown
        populateUsersSelectorDropdown() {
            const usersContainer = document.getElementById('allowedUsersContainer');
            usersContainer.innerHTML = '';

            if (App.allUsersList.length === 0) {
                usersContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted);">No matching workspace users.</div>';
                return;
            }

            App.allUsersList.forEach(u => {
                // Skip self if desired, but general list is better
                const label = document.createElement('label');
                label.className = 'checkbox-label animate-fade-in';
                label.innerHTML = `
                    <input type="checkbox" class="upload-user-checkbox" value="${u.id}">
                    <span>${u.email.split('@')[0]} (${u.role})</span>
                `;
                usersContainer.appendChild(label);
            });

            // Populate departments checkboxes
            const deptsContainer = document.getElementById('allowedDeptsContainer');
            deptsContainer.innerHTML = '';
            
            // Extract unique departments from user lists
            const uniqueDepts = [...new Set(App.allUsersList.map(u => u.department).filter(Boolean))];
            
            if (uniqueDepts.length === 0) {
                deptsContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted);">No departments configured.</div>';
                return;
            }

            uniqueDepts.forEach(dept => {
                const label = document.createElement('label');
                label.className = 'checkbox-label animate-fade-in';
                label.innerHTML = `
                    <input type="checkbox" class="upload-dept-checkbox" value="${dept}">
                    <span>${dept}</span>
                `;
                deptsContainer.appendChild(label);
            });
        },

        // Polling loop to refresh status badges until completed
        startPollingIfNeeded() {
            // Check if any documents are indexing
            const hasPending = this.documents.some(d => {
                const s = d.status.toLowerCase();
                return s === 'uploaded' || s === 'processing' || s === 'parsed';
            });

            if (hasPending && !App.pollingInterval) {
                console.log('Staging active status polling loop...');
                App.pollingInterval = setInterval(async () => {
                    try {
                        const response = await AuthManager.fetchWithAuth('/api/documents/');
                        if (response.ok) {
                            this.documents = await response.json();
                            this.renderDocumentsList();
                            
                            // Stop polling if none pending
                            const stillPending = this.documents.some(d => {
                                const s = d.status.toLowerCase();
                                return s === 'uploaded' || s === 'processing' || s === 'parsed';
                            });

                            if (!stillPending) {
                                clearInterval(App.pollingInterval);
                                App.pollingInterval = null;
                                console.log('All documents processed. Stopping polling.');
                            }
                        }
                    } catch (e) {
                        console.error('Status poll failed:', e);
                    }
                }, 3500);
            }
        },

        formatBytes(bytes, decimals = 2) {
            if (!bytes || bytes === 0) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }
    },

    // ==========================================
    // PHASE 5: TEAM & MEMBERS CONTROLLER
    // ==========================================
    TeamController: {
        init() {
            // Auto fetch once on start to prefill dropdown selectors
            this.loadUsersListPromise();
        },

        // Helper promise fetching list
        async loadUsersListPromise() {
            const role = App.currentUser.role.toLowerCase();
            if (role !== 'admin' && role !== 'manager') return;

            try {
                const response = await AuthManager.fetchWithAuth('/api/accounts/users/');
                if (response.ok) {
                    App.allUsersList = await response.json();
                }
            } catch (err) {
                console.error('Failed to pre-cache company users:', err);
            }
        },

        // Fetch team list and display inside grid cards
        async loadTeamMembers() {
            const gridContainer = document.getElementById('teamGridContainer');
            gridContainer.innerHTML = '<div class="tab-loading-state"><span class="spinner"></span><p>Gathering team index...</p></div>';

            const role = App.currentUser?.role?.toLowerCase();
            const isManagerOrAdmin = role === 'admin' || role === 'manager';

            // Load pending employee approvals for managers/admins
            if (isManagerOrAdmin) {
                await this.loadPendingApprovals();
            }

            try {
                const response = await AuthManager.fetchWithAuth('/api/accounts/users/');
                if (response.ok) {
                    const members = await response.json();
                    App.allUsersList = members;
                    this.renderTeamMembersList(members);
                } else {
                    gridContainer.innerHTML = '<div class="alert alert-danger">Error: Standard users cannot fetch full company rosters. Admin/Manager rights required.</div>';
                }
            } catch (err) {
                gridContainer.innerHTML = '<div class="alert alert-danger">Connection Error loading team profiles.</div>';
            }
        },

        // Load pending employee registrations for approval
        async loadPendingApprovals() {
            const section = document.getElementById('pendingApprovalsSection');
            const tableBody = document.getElementById('pendingApprovalsTableBody');
            const countBadge = document.getElementById('pendingApprovalsCount');

            try {
                const response = await AuthManager.fetchWithAuth('/api/accounts/pending-employees/');
                if (!response.ok) return;

                const pending = await response.json();

                if (pending.length === 0) {
                    section.style.display = 'none';
                    return;
                }

                // Show the approvals section
                section.style.display = 'block';
                countBadge.textContent = `${pending.length} pending`;
                tableBody.innerHTML = '';

                pending.forEach(emp => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight: 500;">${emp.full_name || emp.email.split('@')[0]}</td>
                        <td style="color: var(--text-secondary); font-size: 0.85rem;">${emp.email}</td>
                        <td style="color: var(--text-muted); font-size: 0.82rem;">${emp.department || '—'}</td>
                        <td style="text-align: right;">
                            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                <button class="btn-approve-emp" data-id="${emp.id}" style="background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); color: #34d399; padding: 0.3rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;">
                                    ✓ Approve
                                </button>
                                <button class="btn-deny-emp" data-id="${emp.id}" style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; padding: 0.3rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;">
                                    ✕ Deny
                                </button>
                            </div>
                        </td>
                    `;

                    // Approve button
                    tr.querySelector('.btn-approve-emp').addEventListener('click', async () => {
                        await this.handleApprovalAction(emp.id, 'approve');
                    });

                    // Deny button
                    tr.querySelector('.btn-deny-emp').addEventListener('click', async () => {
                        await this.handleApprovalAction(emp.id, 'deny');
                    });

                    tableBody.appendChild(tr);
                });

            } catch (err) {
                console.error('Failed to load pending approvals:', err);
            }
        },

        // Submit approve or deny action to API
        async handleApprovalAction(employeeId, action) {
            try {
                const response = await AuthManager.fetchWithAuth('/api/accounts/approve-employee/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employee_id: employeeId, action })
                });

                if (response.ok) {
                    // Reload the whole team tab to reflect changes
                    await this.loadTeamMembers();
                } else {
                    const data = await response.json().catch(() => ({}));
                    alert(data.detail || 'Failed to process employee approval.');
                }
            } catch (err) {
                console.error('Approval action error:', err);
                alert('Connection error while processing approval.');
            }
        },

        renderTeamMembersList(members) {
            const gridContainer = document.getElementById('teamGridContainer');
            gridContainer.innerHTML = '';

            if (members.length === 0) {
                gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">No active members recorded in company.</div>';
                return;
            }

            members.forEach(member => {
                const card = document.createElement('div');
                card.className = 'team-card glass-card animate-fade-in';

                const initials = member.email.substring(0, 2).toUpperCase();
                const name = member.email.split('@')[0];
                const role = member.role.toLowerCase();
                const dept = member.department || 'Workspace General';

                card.innerHTML = `
                    <div class="team-avatar">${initials}</div>
                    <div class="team-name" style="text-transform: capitalize;">${name}</div>
                    <div class="team-email">${member.email}</div>
                    <div><span class="badge-pill badge-${role}">${role}</span></div>
                    <div class="team-dept">${dept}</div>
                `;

                gridContainer.appendChild(card);
            });
        }
    }
};
