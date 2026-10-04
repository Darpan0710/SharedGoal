// SharedGoal Frontend Interactions
// Supabase client — anon key is safe in the browser; RLS enforces access control
// Get your anon key from: Supabase Dashboard → Project Settings → API
const SUPABASE_URL = 'https://aanxnlabaqmsvxdcnmqg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z2W6GCRu51hFfT08w17NOA_JeoVP8HS';
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Global notification toast
function showToast(message) {
    let toast = $('#globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

// Modal management with focus trapping and restoration
let lastFocusedElement = null;

const getFocusables = container => {
    return Array.from(container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
};

const showModal = (id, triggerElement) => {
    const modal = $(id);
    if (!modal) return;

    lastFocusedElement = triggerElement || document.activeElement;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    const focusables = getFocusables(modal);
    setTimeout(() => {
        if (focusables.length) {
            focusables[0].focus();
        } else {
            modal.focus();
        }
    }, 40);
};

const closeModal = () => {
    $$('.overlay.show').forEach(overlay => {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
    });

    if (lastFocusedElement?.focus) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
};

const openModal = (id, triggerElement) => {
    closeModal();
    showModal(id, triggerElement);
};

// Modal close button and backdrop click listeners
$$('.close').forEach(b => b.onclick = () => closeModal());

$$('.overlay').forEach(o => {
    o.addEventListener('click', e => {
        if (e.target === o) closeModal();
    });
});

// Keyboard navigation: Escape key dismiss and Tab focus trapping
document.addEventListener('keydown', e => {
    const activeOverlay = $('.overlay.show');
    if (!activeOverlay) {
        if (e.key === 'Escape' && $('#mobileMenu')?.classList.contains('show')) {
            toggleMobileMenu(false);
            $('#menuBtn')?.focus();
        }
        return;
    }

    if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
    }

    if (e.key === 'Tab') {
        const focusables = getFocusables(activeOverlay);
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});

// Mobile navigation dropdown
const menuBtn = $('#menuBtn');
const mobileMenu = $('#mobileMenu');

function toggleMobileMenu(forceState) {
    if (!mobileMenu || !menuBtn) return;
    const shouldOpen = forceState !== undefined ? forceState : !mobileMenu.classList.contains('show');
    mobileMenu.classList.toggle('show', shouldOpen);
    menuBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', shouldOpen ? 'Close navigation menu' : 'Open navigation menu');
}

menuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    toggleMobileMenu();
});

$$('#mobileMenu a, #mobileMenu button').forEach(item => {
    item.addEventListener('click', () => toggleMobileMenu(false));
});

document.addEventListener('click', e => {
    if (mobileMenu && menuBtn && !mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        toggleMobileMenu(false);
    }
});

// Profile and notification modal triggers
$$('[data-profile]').forEach(b => b.onclick = () => openModal('#profileOverlay', b));
$$('[data-login]').forEach(b => b.onclick = () => openModal('#loginOverlay', b));
$('#notificationBtn')?.addEventListener('click', async () => {
    await loadNotifications();
    openModal('#notificationsOverlay', $('#notificationBtn'));
});

// Prevent past dates in date inputs
$$('input[type="date"]').forEach(input => {
    input.min = new Date().toISOString().split('T')[0];
});

// Create Goal Wizard (7-step flow)
let currentStep = 1;
let editingFromReview = false;

const goalData = {
    occasion: 'Birthday',
    name: '',
    description: '',
    target: 0,
    deadline: '',
    style: 'Equal split',
    visibility: 'Private'
};

function goToStep(n) {
    currentStep = n;
    $$('.goal-step').forEach(stepEl => {
        stepEl.classList.toggle('active', Number(stepEl.dataset.step) === n);
    });

    const stepLabel = $('#currentStepLabel');
    if (stepLabel) stepLabel.textContent = `Step ${n} of 7`;

    if (n === 7) {
        editingFromReview = false;
        updateReviewScreen();
    }
}

function updateReviewScreen() {
    const revOccasion = $('#revOccasion');
    const revName = $('#revName');
    const revDesc = $('#revDesc');
    const revTarget = $('#revTarget');
    const revDeadline = $('#revDeadline');
    const revStyle = $('#revStyle');
    const revVisibility = $('#revVisibility');
    const revInvites = $('#revInvites');
    const revInvitesRow = $('#revInvitesRow');

    if (revOccasion) revOccasion.textContent = goalData.occasion;
    if (revName) revName.textContent = goalData.name || 'Untitled Goal';
    if (revDesc) revDesc.textContent = goalData.description || 'No description provided.';
    if (revTarget) revTarget.textContent = '₹' + Number(goalData.target || 0).toLocaleString('en-IN');

    if (revDeadline) {
        if (goalData.deadline) {
            const daysLeft = Math.max(1, Math.ceil((new Date(goalData.deadline) - new Date()) / (1000 * 60 * 60 * 24)));
            revDeadline.textContent = `${goalData.deadline} (${daysLeft} days left)`;
        } else {
            revDeadline.textContent = 'No deadline';
        }
    }

    if (revStyle) revStyle.textContent = goalData.style;
    if (revVisibility) revVisibility.textContent = goalData.visibility;

    if (revInvitesRow) {
        const isPublic = goalData.visibility === 'Public';
        revInvitesRow.style.display = isPublic ? 'none' : 'flex';
        if (revInvites && !isPublic) {
            revInvites.textContent = 'Share link will be generated';
        }
    }
}

$$('.edit-step-btn').forEach(btn => {
    btn.onclick = () => {
        const targetStep = Number(btn.dataset.gotoStep);
        if (targetStep) {
            editingFromReview = true;
            goToStep(targetStep);
        }
    };
});

function startCreateGoal(occasion, triggerEl) {
    editingFromReview = false;
    if (occasion) {
        goalData.occasion = occasion;
        $$('#step1Choices button').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.value === occasion);
        });
        const customWrap = $('#customCategoryWrap');
        if (customWrap) customWrap.style.display = occasion === 'Custom' ? 'block' : 'none';
    }
    goToStep(1);
    openModal('#createGoalOverlay', triggerEl);
}

$$('[data-create], .chips button').forEach(btn => {
    btn.onclick = () => startCreateGoal(btn.dataset.occasion || '', btn);
});

// Step 1: Occasion selection
$$('#step1Choices button').forEach(btn => {
    btn.onclick = () => {
        $$('#step1Choices button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        goalData.occasion = btn.dataset.value;

        const customWrap = $('#customCategoryWrap');
        if (customWrap) {
            customWrap.style.display = goalData.occasion === 'Custom' ? 'block' : 'none';
        }
    };
});

$('#step1Next')?.addEventListener('click', () => {
    if (goalData.occasion === 'Custom') {
        const customVal = $('#customOccasionInput')?.value.trim();
        if (!customVal) {
            showToast('Please enter your custom occasion name.');
            $('#customOccasionInput')?.focus();
            return;
        }
        goalData.occasion = customVal;
    }
    goToStep(editingFromReview ? 7 : 2);
});

// Step 2: Name and description
$('#step2Next')?.addEventListener('click', () => {
    const name = $('#goalName')?.value.trim();
    const desc = $('#goalDesc')?.value.trim();

    if (!name) {
        showToast('Please provide a name for your goal.');
        $('#goalName')?.focus();
        return;
    }

    goalData.name = name;
    goalData.description = desc;
    goToStep(editingFromReview ? 7 : 3);
});

// Step 3: Target amount and deadline
$('#step3Next')?.addEventListener('click', () => {
    const amount = Number($('#goalAmount')?.value);
    const deadline = $('#goalDeadline')?.value;

    if (!amount || amount < 100) {
        showToast('Please enter a target amount of at least ₹100.');
        $('#goalAmount')?.focus();
        return;
    }

    if (!deadline) {
        showToast('Please select a deadline for this goal.');
        $('#goalDeadline')?.focus();
        return;
    }

    goalData.target = amount;
    goalData.deadline = deadline;
    goToStep(editingFromReview ? 7 : 4);
});

// Step 4: Contribution style and visibility
$$('#styleChoices button').forEach(btn => {
    btn.onclick = () => {
        $$('#styleChoices button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        goalData.style = btn.dataset.value;
    };
});

$$('#visibilityChoices button').forEach(btn => {
    btn.onclick = () => {
        $$('#visibilityChoices button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        goalData.visibility = btn.dataset.value;
    };
});

$('#step4Next')?.addEventListener('click', () => {
    goToStep(editingFromReview ? 7 : 5);
});

// Step 5: Creator authentication — requires real Google session
$('#step5Next')?.addEventListener('click', () => {
    if (!window.currentUser) {
        // Save current wizard state before OAuth redirect
        sessionStorage.setItem('pendingCreateGoal', JSON.stringify({
            data: goalData
        }));

        sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        return;
    }
    // Update the step-5 preview with the real user
    const name = window.currentUser.user_metadata?.full_name || window.currentUser.email?.split('@')[0] || '';
    const initial = name[0]?.toUpperCase() || '?';
    $$('.google-user-preview .user-avatar-circle').forEach(el => el.textContent = initial);
    $$('.google-user-preview strong').forEach(el => el.textContent = name);
    $$('.google-user-preview small').forEach(el => el.textContent = window.currentUser.email || '');
    $$('#step5Next').forEach(btn => btn.textContent = `Continue as ${name.split(' ')[0]}`);
    goToStep(goalData.visibility === 'Public' ? 7 : 6);
});

// Step 6: Invitations logic removed (using share links only)

$('#copyInviteLinkBtn')?.addEventListener('click', () => {
    const span = $('#copyInviteLinkBtn')?.closest('.copy-link-box')?.querySelector('span');
    const link = span?.textContent?.trim();
    if (!link || !link.startsWith('http')) {
        showToast('Your invite link will be ready after you create the goal.');
        return;
    }
    navigator.clipboard?.writeText(link);
    showToast('Goal invitation link copied to clipboard!');
});

$('#step6Next')?.addEventListener('click', () => goToStep(7));

// Step 7: Goal creation — saves to Supabase
$('#finishGoalBtn')?.addEventListener('click', async () => {
    if (!window.currentUser) {
        showToast('Please sign in to create a goal.');
        return;
    }

    const btn = $('#finishGoalBtn');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    const { data: goal, error } = await sb
        .from('goals')
        .insert({
            creator_id: window.currentUser.id,
            name: goalData.name,
            occasion: goalData.occasion,
            description: goalData.description,
            target_amount: goalData.target,
            deadline: goalData.deadline,
            is_private: goalData.visibility === 'Private',
            status: 'Active'
        })
        .select('id')
        .single();

    if (error) {
        showToast('Failed to create goal. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Create SharedGoal';
        return;
    }

    // Clear the pending OAuth resume state now that creation succeeded
    sessionStorage.removeItem('pendingCreateGoal');

    // Add creator as member
    await sb.from('goal_members').insert({
        goal_id: goal.id,
        user_id: window.currentUser.id,
        role: 'Creator'
    });

    // Create/store invitations for private goals
    if (goalData.visibility === 'Private') {
        // Create general invite for the copy link UI
        const { data: generalInvite } = await sb.from('goal_invites').insert({
            goal_id: goal.id,
            email: null,
            role: 'Contributor',
            status: 'Pending'
        }).select('token').single();

        if (generalInvite) {
            const goalUrl = window.location.origin + '/my-goals.html?invite=' + generalInvite.token;
            sessionStorage.setItem('sharedGoalCreatedLink', goalUrl);
            $$('.copy-link-box span').forEach(el => el.textContent = goalUrl);
        }

    }

    // Re-enable the Copy Link button now that goal is created (if applicable)
    $$('#copyInviteLinkBtn').forEach(btn => btn.disabled = false);

    showToast('🎉 SharedGoal created successfully!');
    btn.disabled = false;
    btn.textContent = 'Create SharedGoal';
    closeModal();

    setTimeout(() => {
        if (!window.location.pathname.includes('my-goals.html')) {
            window.location.href = 'my-goals.html';
        } else {
            loadMyGoals();
        }
    }, 700);
});

$$('.step-back-btn').forEach(btn => {
    btn.onclick = () => {
        if (currentStep === 7 && goalData.visibility === 'Public') {
            goToStep(5);
        } else if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    };
});

// Quick contribution flow
let currentContributeGoalId = null;
let currentContributeHelpId = null;

$$('[data-contribute]').forEach(btn => {
    btn.onclick = () => {
        currentContributeGoalId = btn.dataset.contributeId || null;
        currentContributeHelpId = btn.dataset.helpId || null;
        const titleEl = $('#contributionGoal');
        if (titleEl) titleEl.textContent = btn.dataset.contribute || 'Goal';
        openModal('#contributionOverlay', btn);
    };
});

$$('.quick button').forEach(btn => {
    btn.onclick = () => {
        const input = $('#contributionAmount');
        if (input) input.value = btn.dataset.amount;
    };
});

$$('.payments button').forEach(btn => {
    btn.onclick = () => {
        $$('.payments button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

$('#makeContributionBtn')?.addEventListener('click', async () => {
    const amount = Number($('#contributionAmount')?.value);
    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
        showToast('Please enter a valid numeric contribution amount.');
        return;
    }

    const paymentMethod = $('.payments button.active')?.textContent?.trim() || 'UPI';

    if (paymentMethod === 'Razorpay') {
        showToast('PAYMENT BACKEND BLOCKER: Secure server-side endpoint for Razorpay order creation and signature verification is missing. Cannot process real payment.');
        return;
    }

    if (!window.currentUser || (!currentContributeGoalId && !currentContributeHelpId)) {
        showToast(`₹${amount.toLocaleString('en-IN')} contribution recorded via ${paymentMethod}.`);
        closeModal();
        currentContributeHelpId = null;
        currentContributeGoalId = null;
        return;
    }

    const btn = $('#makeContributionBtn');
    btn.disabled = true;

    if (currentContributeHelpId) {
        const { error } = await sb.rpc('submit_help_contribution', {
            target_help_id: Number(currentContributeHelpId),
            contribution_amount: Number(amount),
            contribution_method: paymentMethod
        });

        if (error) {
            console.error('Help contribution:', error);
            showToast('Failed to submit contribution. Please try again.');
            btn.disabled = false;
            return;
        }
    } else if (currentContributeGoalId) {
        const { error } = await sb.from('contributions').insert({
            goal_id: currentContributeGoalId,
            user_id: window.currentUser.id,
            amount,
            payment_method: paymentMethod,
            status: 'Pending'
        });

        if (error) {
            showToast('Failed to record contribution. Please try again.');
            btn.disabled = false;
            return;
        }
    }

    btn.disabled = false;

    if (currentContributeHelpId) {
        showToast(`₹${amount.toLocaleString('en-IN')} contribution submitted via ${paymentMethod}.`);
    } else {
        showToast(`₹${amount.toLocaleString('en-IN')} contribution submitted via ${paymentMethod}. Pending confirmation.`);
    }

    currentContributeHelpId = null;
    currentContributeGoalId = null;

    closeModal();
    if ($('#mainGoalTitle')) loadMyGoals();
});

// My Goals — goal display
const categoryImages = {
    birthday: 'assets/images/occasion-01-birthday.png',
    wedding: 'assets/images/occasion-02-wedding.png',
    trip: 'assets/images/occasion-03-trip.png',
    farewell: 'assets/images/occasion-04-farewell.png',
    'college event': 'assets/images/occasion-05-college-event.png',
    festival: 'assets/images/occasion-06-festival.png',
    education: 'assets/images/help-01-education.png',
    medical: 'assets/images/help-02-medical.png',
    'medical help': 'assets/images/help-02-medical.png',
    'basic needs': 'assets/images/help-04-basic.png',
    assistance: 'assets/images/help-03-assistance.png',
    'assistance & relief': 'assets/images/help-03-assistance.png',
    charity: 'assets/images/help-03-assistance.png',
    'help someone': 'assets/images/help-03-assistance.png',
    'charity / help someone': 'assets/images/help-03-assistance.png'
};

function showGoalData(g) {
    const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    setText('#mainGoalTitle', g.title);
    setText('#mainGoalOccasion', g.occasion);
    setText('#mainGoalDesc', g.description);
    setText('#mainGoalCollected', '₹' + g.collected.toLocaleString('en-IN'));
    setText('#mainGoalTarget', ' of ₹' + g.target.toLocaleString('en-IN'));
    setText('#mainGoalPercent', g.percent + '% collected');
    setText('#mainGoalDays', g.daysLeft > 0 ? `${g.daysLeft} days left` : 'Completed');
    setText('#mainGoalMembers', `${g.members} members`);
    setText('#yourContribAmount', '₹' + g.userContrib.toLocaleString('en-IN'));

    const img = $('#mainGoalImg');
    if (img) img.src = g.image;
    const bar = $('#mainGoalBar');
    if (bar) bar.style.width = g.percent + '%';

    // Dashboard Integration
    if (!g.rawGoal) return;

    window.currentDashboardGoal = g;

    // 2. Your Contribution
    const hasContrib = g.userContrib > 0;
    setText('#yourContribBadge', hasContrib ? 'Confirmed' : '—');
    const badgeEl = $('#yourContribBadge');
    if (badgeEl) badgeEl.className = hasContrib ? 'status-badge confirmed' : 'status-badge';
    setText('#yourContribDetail', hasContrib ? 'Thanks for being part of this goal!' : 'No contribution yet.');
    const contribBtn = $('#addContribBtn');
    if (contribBtn) {
        contribBtn.dataset.contributeId = g.id;
        contribBtn.dataset.contribute = g.title;
        // ensure event listener runs
        contribBtn.onclick = () => {
            currentContributeGoalId = g.id;
            const titleEl = $('#contributionGoal');
            if (titleEl) titleEl.textContent = g.title;
            openModal('#contributionOverlay', contribBtn);
        };
    }

    // 3. Members
    setText('#memberCountBadge', `${g.members} people`);
    const membersRow = $('#membersAvatarRow');
    const membersList = $('#membersListContainer');
    if (membersRow && membersList) {
        membersRow.innerHTML = '';
        membersList.innerHTML = '';
        const members = g.rawGoal.goal_members || [];

        members.slice(0, 4).forEach(m => {
            const initial = m.profiles?.name ? m.profiles.name.charAt(0).toUpperCase() : '?';
            membersRow.innerHTML += `<i>${initial}</i>`;
        });
        if (members.length > 4) {
            membersRow.innerHTML += `<i class="more">+${members.length - 4}</i>`;
        }

        if (members.length === 0) {
            membersList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No members yet.</p>';
        } else {
            members.forEach(m => {
                const name = m.profiles?.name || 'Unknown';
                membersList.innerHTML += `
                    <div class="member-item">
                        <div class="member-info">
                            <strong>${name}</strong>
                        </div>
                        <span class="member-role">${m.role}</span>
                    </div>
                `;
            });
        }
    }

    // 4. Contributions
    const contribs = g.rawGoal.contributions || [];
    const confirmedCount = contribs.filter(c => c.status === 'Confirmed').length;
    setText('#contribCountBadge', confirmedCount > 0 ? `${confirmedCount} Confirmed` : '—');
    const cBadgeEl = $('#contribCountBadge');
    if (cBadgeEl) cBadgeEl.className = confirmedCount > 0 ? 'status-badge confirmed' : 'status-badge';

    const contribList = $('#contribListContainer');
    if (contribList) {
        contribList.innerHTML = '';
        if (contribs.length === 0) {
            contribList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No contributions yet.</p>';
        } else {
            const isCreatorForContribs = g.rawGoal.creator_id === window.currentUser?.id;

            contribs.forEach(c => {
                const name = c.profiles?.name || 'Unknown';
                const dateStr = new Date(c.created_at).toLocaleDateString();
                const methodStr = c.payment_method || 'Unknown';
                
                let confirmHtml = '';
                if (c.status === 'Pending' && isCreatorForContribs) {
                    confirmHtml = `<div style="margin-top: 0.5rem;"><button class="btn small" data-confirm-goal-contribution="${c.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Confirm</button></div>`;
                }

                contribList.innerHTML += `
                    <div class="row-item" style="${confirmHtml ? 'align-items: flex-start;' : ''}">
                        <div style="flex: 1;">
                            <strong>${name}</strong>
                            <small style="${confirmHtml ? 'display: block; margin-bottom: 0.25rem;' : ''}">${methodStr} · ${dateStr}</small>
                            ${confirmHtml}
                        </div>
                        <span class="amount-cell" ${c.status === 'Pending' ? 'style="color: var(--amber);"' : ''}>₹${Number(c.amount).toLocaleString('en-IN')}</span>
                    </div>
                `;
            });

            $$('[data-confirm-goal-contribution]').forEach(btn => {
                btn.onclick = async () => {
                    btn.disabled = true;
                    btn.textContent = 'Confirming...';
                    const contributionId = btn.dataset.confirmGoalContribution;
                    
                    const { data, error } = await sb
                        .from('contributions')
                        .update({ status: 'Confirmed' })
                        .eq('id', Number(contributionId))
                        .select();

                    if (error || !data || data.length === 0) {
                        console.error('Confirm goal contribution:', error || 'No rows updated (RLS block).');
                        showToast('Failed to confirm contribution. Please try again.');
                        btn.disabled = false;
                        btn.textContent = 'Confirm';
                        return;
                    }

                    showToast('Contribution confirmed successfully.');
                    
                    // Optimistically update the UI without losing tab state
                    const targetC = g.rawGoal.contributions.find(c => c.id === Number(contributionId));
                    if (targetC) {
                        targetC.status = 'Confirmed';
                        const confirmed = g.rawGoal.contributions.filter(c => c.status === 'Confirmed');
                        g.collected = confirmed.reduce((s, c) => s + Number(c.amount), 0);
                        g.percent = Math.min(100, Math.round((g.collected / g.target) * 100)) || 0;
                        if (targetC.user_id === window.currentUser?.id) {
                            g.userContrib += Number(targetC.amount);
                        }
                        showGoalData(g);
                    }
                };
            });
        }
    }

    // 7. Activity Timeline
    const timeline = $('#activityTimelineContainer');
    if (timeline) {
        timeline.innerHTML = '';
        const events = [];
        events.push({ text: `Goal created`, sub: new Date(g.rawGoal.created_at).toLocaleDateString(), date: new Date(g.rawGoal.created_at) });

        contribs.forEach(c => {
            const name = c.profiles?.name || 'Someone';
            events.push({
                text: `${name} contributed ₹${Number(c.amount).toLocaleString('en-IN')}`,
                sub: `${new Date(c.created_at).toLocaleDateString()} via ${c.payment_method || 'Unknown'}`,
                date: new Date(c.created_at)
            });
        });

        const members = g.rawGoal.goal_members || [];
        members.forEach(m => {
            if (m.role !== 'Creator') {
                const name = m.profiles?.name || 'Someone';
                events.push({
                    text: `${name} joined the goal`,
                    sub: new Date(m.joined_at).toLocaleDateString(),
                    date: new Date(m.joined_at)
                });
            }
        });

        events.sort((a, b) => b.date - a.date);

        if (events.length === 0) {
            timeline.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No activity yet.</p>';
        } else {
            events.forEach(e => {
                timeline.innerHTML += `
                    <div class="row-item">
                        <div>
                            <strong>${e.text}</strong>
                            <small>${e.sub}</small>
                        </div>
                    </div>
                `;
            });
        }
    }

    // 8. Spending
    setText('#spendingCollected', '₹' + g.collected.toLocaleString('en-IN'));

    // 9. Complete Goal overlay — show real collected amount
    setText('#completeGoalCollected', '₹' + g.collected.toLocaleString('en-IN'));
    const expendInput = $('#completeGoalOverlay input[type="number"]');
    if (expendInput) expendInput.value = g.collected;

    // 10. Share Invite / Copy Goal Link button
    const copyGoalLinkBtn = $('#copyGoalLinkBtn');
    const inviteMoreMembersBtn = $('#inviteMoreMembersBtn');

    const currentUserRole = g.rawGoal.goal_members?.find(m => m.user_id === window.currentUser?.id)?.role;
    const canShareInvite = currentUserRole === 'Creator';

    if (copyGoalLinkBtn) {
        copyGoalLinkBtn.style.display = canShareInvite ? '' : 'none';
    }
    if (inviteMoreMembersBtn) {
        inviteMoreMembersBtn.style.display = canShareInvite ? '' : 'none';
    }

    const handleShareClick = async (showInModal = false) => {
        if (!canShareInvite) return;

        if (showInModal) {
            openModal('#inviteMemberOverlay');
            $('#dashboardInviteLinkText').textContent = 'Generating link...';
            $('#copyDashboardInviteLinkBtn').disabled = true;
        }

        let shareUrl = window.location.origin + '/my-goals.html';

        const payload = {
            goal_id: g.goalId,
            email: '',
            invited_by: window.currentUser?.id,
            status: 'Pending'
        };
        const { data, error } = await sb.from('goal_invites').insert(payload).select('token').single();

        if (error) console.error('Share Goal API Error:', error);

        if (!error && data) {
            shareUrl = window.location.origin + '/my-goals.html?invite=' + data.token;
        } else {
            if (showInModal) $('#dashboardInviteLinkText').textContent = 'Failed to generate link.';
            else showToast('Failed to generate invite link.');
            return;
        }

        if (showInModal) {
            $('#dashboardInviteLinkText').textContent = shareUrl;
            $('#copyDashboardInviteLinkBtn').disabled = false;
            $('#copyDashboardInviteLinkBtn').onclick = () => {
                navigator.clipboard?.writeText(shareUrl);
                showToast('Goal invitation link copied to clipboard!');
            };
        } else {
            navigator.clipboard?.writeText(shareUrl);
            showToast(g.rawGoal.is_private ? 'Private invite link copied to clipboard!' : 'Goal invite link copied to clipboard!');
        }
    };

    if (copyGoalLinkBtn && g.goalId) {
        copyGoalLinkBtn.onclick = () => handleShareClick(false);
    }
    if (inviteMoreMembersBtn && g.goalId) {
        inviteMoreMembersBtn.onclick = () => handleShareClick(true);
    }

    // 11. Contribute button — set real goal id
    $$('[data-contribute]').forEach(btn => {
        if (!btn.closest('#createGoalOverlay')) {
            btn.dataset.contributeId = g.goalId;
            btn.dataset.contribute = g.title;
        }
    });

    // 12. Group Decision (Gift Suggestions & Voting)
    const suggestions = g.rawGoal.gift_suggestions || [];
    const members = g.rawGoal.goal_members || [];
    const memberCount = members.length || 1;
    const isCreator = members.some(m => m.user_id === window.currentUser?.id && m.role === 'Creator');

    const selectedGift = suggestions.find(s => s.is_selected);

    userSuggestionsCount = suggestions.filter(s => s.user_id === window.currentUser?.id).length;
    userVotesCount = suggestions.reduce((total, s) => {
        const v = s.gift_votes || [];
        return total + (v.some(vote => vote.user_id === window.currentUser?.id) ? 1 : 0);
    }, 0);

    const giftList = $('#giftItemsList');
    if (giftList) {
        giftList.innerHTML = '';
        if (selectedGift) {
            const member = members.find(m => m.user_id === selectedGift.user_id);
            const name = member?.profiles?.name || 'Someone';
            const linkStr = selectedGift.link ? `<a href="${selectedGift.link}" target="_blank" rel="noopener noreferrer" style="color: var(--teal); text-decoration: underline;">(Link)</a>` : '';
            giftList.innerHTML = `
                <div class="gift-item" style="border: 2px solid var(--teal); background: rgba(56, 178, 172, 0.05);">
                    <div>
                        <strong style="color: var(--teal);">🎉 Final Decision: ${selectedGift.name}</strong>
                        <small style="display: block; color: var(--muted);">₹${Number(selectedGift.price).toLocaleString('en-IN')} · Suggested by ${name} ${linkStr}</small>
                    </div>
                </div>
            `;
        } else if (suggestions.length === 0) {
            giftList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No suggestions yet.</p>';
        } else {
            suggestions.sort((a, b) => (b.gift_votes || []).length - (a.gift_votes || []).length).forEach(s => {
                const member = members.find(m => m.user_id === s.user_id);
                const name = member?.profiles?.name || 'Someone';
                const votes = s.gift_votes || [];
                const isVoted = votes.some(v => v.user_id === window.currentUser?.id);
                const voteCount = votes.length;
                const percent = Math.round((voteCount / memberCount) * 100);
                const linkStr = s.link ? `<a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color: var(--teal); text-decoration: underline;">(Link)</a>` : '';

                const item = document.createElement('div');
                item.className = 'gift-item';

                let actionHTML = `
                    <button class="gift-vote-btn ${isVoted ? 'voted' : ''}" data-id="${s.id}" aria-label="Vote for ${s.name}">
                        👍 <span class="vote-count">${voteCount}</span>
                    </button>
                `;

                if (percent >= 60 && isCreator) {
                    actionHTML += `
                        <button class="finalize-gift-btn" data-id="${s.id}" style="margin-left: 10px; background: var(--teal); color: white; border: none; padding: 4px 10px; border-radius: 4px; font-weight: 500; font-size: 13px; cursor: pointer;">
                            Finalize
                        </button>
                    `;
                }

                item.innerHTML = `
                    <div>
                        <strong>🎁 ${s.name}</strong>
                        <small style="display: block; color: var(--muted);">₹${Number(s.price).toLocaleString('en-IN')} · Suggested by ${name} ${linkStr}</small>
                        <small style="display: block; color: var(--teal); font-weight: 600; margin-top: 4px;">${percent}% of members voted (${voteCount}/${memberCount})</small>
                    </div>
                    <div style="display: flex; align-items: center;">
                        ${actionHTML}
                    </div>
                `;
                giftList.appendChild(item);

                const voteBtn = item.querySelector('.gift-vote-btn');
                if (voteBtn) bindGiftVoteBtn(voteBtn);

                const finalizeBtn = item.querySelector('.finalize-gift-btn');
                if (finalizeBtn) bindFinalizeGiftBtn(finalizeBtn);
            });
        }
    }

    const groupDecisionContainer = $('#groupDecisionContainer');
    if (groupDecisionContainer) {
        if (selectedGift) {
            const votes = selectedGift.gift_votes || [];
            const percent = Math.round((votes.length / memberCount) * 100);
            groupDecisionContainer.innerHTML = `
                <div style="margin-top: 8px;">
                    <strong style="display: block; font-size: 16px; margin-bottom: 12px; color: var(--teal);">Decision Finalized ✓</strong>
                    <div style="font-size: 15px; font-weight: 500; margin-bottom: 2px;">${selectedGift.name}</div>
                    <div style="color: var(--teal); font-weight: 600; margin-bottom: 12px;">₹${Number(selectedGift.price).toLocaleString('en-IN')}</div>
                    <small style="display: block; color: var(--text-secondary); margin-bottom: 2px;">${percent}% member approval</small>
                    <small style="display: block; color: var(--text-secondary);">Finalized by Creator</small>
                </div>
            `;
        } else {
            groupDecisionContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No group decisions yet.</p>';
        }
    }

    const suggestBtn = $('#openSuggestGiftBtn');
    if (suggestBtn) {
        if (selectedGift) {
            suggestBtn.style.display = 'none';
        } else {
            suggestBtn.style.display = '';
            if (userSuggestionsCount >= MAX_SUGGESTIONS) {
                suggestBtn.textContent = 'Suggestion limit reached (2 of 2 used)';
            } else {
                suggestBtn.textContent = '+ Suggest Gift Idea';
            }
        }
    }
}

// Demo goals — shown when user is not signed in
const sampleGoals = {
    aarav: {
        title: "Aarav's Birthday Gift",
        occasion: "🎂 Birthday · Active · Private",
        image: "assets/images/occasion-01-birthday.png",
        description: "Let's get Aarav something he'll actually love — Sony WH-1000XM5 headphones with travel case.",
        collected: 18500, target: 25000, percent: 74, daysLeft: 12, members: 6, userContrib: 3000
    },
    goa: {
        title: "Goa Weekend Getaway",
        occasion: "✈️ Trip · Active · Private",
        image: "assets/images/hero-01.png",
        description: "Villa rental, scooty rentals and sunset dinner for our college reunion gang.",
        collected: 32000, target: 40000, percent: 80, daysLeft: 19, members: 8, userContrib: 5000
    },
    farewell: {
        title: "Farewell Gift for Maya",
        occasion: "🎉 Farewell · Completed · Private",
        image: "assets/images/help-03-assistance.png",
        description: "Custom engraved Kindle Oasis and leather sleeve for Maya's new chapter in London.",
        collected: 16500, target: 15000, percent: 100, daysLeft: 0, members: 9, userContrib: 2000
    }
};

function updateGoalsEmptyState() {
    const emptyEl = $('#goalsEmptyState');
    const contentEl = $('#goalsContent');
    const hasGoals = Object.keys(sampleGoals).length > 0;

    if (emptyEl && contentEl) {
        emptyEl.style.display = hasGoals ? 'none' : 'flex';
        contentEl.style.display = hasGoals ? 'block' : 'none';
    }
}
updateGoalsEmptyState();

function bindGoalTabs() {
    $$('.goal-tabs button[data-goal]').forEach(btn => {
        btn.onclick = () => {
            const g = sampleGoals[btn.dataset.goal];
            if (!g) return;
            $$('.goal-tabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showGoalData(g);
        };
    });
}
bindGoalTabs();

// Load real goals from Supabase
async function loadMyGoals() {
    if (!window.currentUser) return;

    const { data: memberRows } = await sb.from('goal_members').select('goal_id').eq('user_id', window.currentUser.id);
    const goalIds = (memberRows || []).map(r => r.goal_id);

    if (!goalIds.length) {
        Object.keys(sampleGoals).forEach(k => delete sampleGoals[k]);
        updateGoalsEmptyState();
        return;
    }

    const { data: rows, error } = await sb
        .from('goals')
        .select(`
            id, name, occasion, description, target_amount, deadline, is_private, status, created_at, creator_id,
            goal_members(user_id, role, joined_at, profiles(name, avatar_url)),
            contributions(id, amount, status, user_id, created_at, payment_method, profiles(name, avatar_url)),
            gift_suggestions(id, name, price, link, is_selected, created_at, user_id, gift_votes(user_id))
        `)
        .in('id', goalIds)
        .in('status', ['Active', 'Completed', 'Closed', 'Expired']);

    if (error) {
        console.error("Supabase Error loading goals:", error);
    }

    if (error || !rows?.length) {
        // clear demo data, show empty state
        Object.keys(sampleGoals).forEach(k => delete sampleGoals[k]);
        updateGoalsEmptyState();
        return;
    }

    // Replace demo data with real goals (RLS guarantees only the user's visible goals are returned)
    Object.keys(sampleGoals).forEach(k => delete sampleGoals[k]);

    rows.forEach(g => {
        const confirmed = (g.contributions || []).filter(c => c.status === 'Confirmed');
        const collected = confirmed.reduce((s, c) => s + Number(c.amount), 0);
        const userContrib = confirmed
            .filter(c => c.user_id === window.currentUser.id)
            .reduce((s, c) => s + Number(c.amount), 0);
        const target = Number(g.target_amount) || 0;
        const percent = target > 0 ? Math.min(100, Math.round(collected / target * 100)) : 0;
        const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 86400000));
        const visibility = g.is_private ? 'Private' : 'Public';

        sampleGoals[g.id] = {
            title: g.name,
            occasion: `${g.occasion} · ${g.status} · ${visibility}`,
            image: categoryImages[(g.occasion || '').trim().toLowerCase()] || 'assets/images/occasion-01-birthday.png',
            description: g.description || '',
            collected, target, percent, daysLeft,
            members: (g.goal_members || []).length,
            userContrib,
            id: g.id,
            goalId: g.id,
            rawGoal: g
        };
    });

    // Rebuild tabs
    const tabsEl = $('.goal-tabs');
    if (tabsEl) {
        // Keep the "+ Start Another Goal" button
        const addBtn = tabsEl.querySelector('[data-create]');
        tabsEl.innerHTML = '';
        Object.entries(sampleGoals).forEach(([key, g], i) => {
            const btn = document.createElement('button');
            btn.dataset.goal = key;
            btn.dataset.contributeId = g.goalId;
            if (i === 0) btn.classList.add('active');
            btn.textContent = g.title;
            tabsEl.appendChild(btn);
        });
        if (addBtn) tabsEl.appendChild(addBtn);

        // Update contribute buttons with real goal id
        const firstGoal = Object.values(sampleGoals)[0];
        if (firstGoal) {
            $$('[data-contribute]').forEach(b => {
                b.dataset.contributeId = firstGoal.goalId;
            });
        }

        bindGoalTabs();
    }

    updateGoalsEmptyState();

    // Show first goal
    const firstKey = Object.keys(sampleGoals)[0];
    if (firstKey) showGoalData(sampleGoals[firstKey]);

    // Apply newly-created goal invite link passed via sessionStorage from index.html
    const pendingLink = sessionStorage.getItem('sharedGoalCreatedLink');
    if (pendingLink) {
        $$('.copy-link-box span').forEach(el => el.textContent = pendingLink);
        $$('#copyInviteLinkBtn').forEach(btn => btn.disabled = false);
        sessionStorage.removeItem('sharedGoalCreatedLink');
    }
}

// Gift suggestions and voting
let userVotesCount = 1;
const MAX_VOTES = 3;
let userSuggestionsCount = 0;
const MAX_SUGGESTIONS = 2;

function bindGiftVoteBtn(btn) {
    btn.onclick = async () => {
        if (!window.currentUser || !window.currentDashboardGoal) return;
        const suggestionId = btn.dataset.id;
        if (!suggestionId) return;

        const isVoted = btn.classList.contains('voted');
        const countSpan = btn.querySelector('.vote-count');
        let count = Number(countSpan?.textContent || 0);

        btn.disabled = true;

        if (isVoted) {
            const { error } = await sb.from('gift_votes')
                .delete()
                .eq('suggestion_id', suggestionId)
                .eq('user_id', window.currentUser.id);

            if (!error) {
                btn.classList.remove('voted');
                userVotesCount--;
                if (countSpan) countSpan.textContent = Math.max(0, count - 1);
                showToast('Vote removed.');
                const s = window.currentDashboardGoal.rawGoal.gift_suggestions?.find(s => s.id == suggestionId);
                if (s && s.gift_votes) s.gift_votes = s.gift_votes.filter(v => v.user_id !== window.currentUser.id);
            } else {
                showToast('Failed to remove vote.');
            }
        } else {
            if (userVotesCount >= MAX_VOTES) {
                showToast(`Maximum ${MAX_VOTES} votes reached across gift ideas.`);
                btn.disabled = false;
                return;
            }

            const { error } = await sb.from('gift_votes')
                .insert({ suggestion_id: suggestionId, user_id: window.currentUser.id });

            if (!error) {
                btn.classList.add('voted');
                userVotesCount++;
                if (countSpan) countSpan.textContent = count + 1;
                showToast('Vote recorded! Creator will decide final pick.');
                const s = window.currentDashboardGoal.rawGoal.gift_suggestions?.find(s => s.id == suggestionId);
                if (s && s.gift_votes) s.gift_votes.push({ user_id: window.currentUser.id });
            } else {
                showToast('Failed to record vote.');
            }
        }
        btn.disabled = false;
    };
}
$$('.gift-vote-btn').forEach(bindGiftVoteBtn);

function bindFinalizeGiftBtn(btn) {
    btn.onclick = async () => {
        if (!window.currentUser || !window.currentDashboardGoal) return;
        const suggestionId = btn.dataset.id;
        if (!suggestionId) return;

        btn.disabled = true;
        btn.textContent = 'Finalizing...';

        try {
            const { error } = await sb.rpc('finalize_gift_decision', { target_suggestion_id: parseInt(suggestionId, 10) });

            if (error) throw error;

            showToast('Gift successfully selected!');
            if (typeof loadMyGoals === 'function') loadMyGoals();
        } catch (err) {
            showToast(err.message || 'Failed to finalize gift.');
            btn.disabled = false;
            btn.textContent = 'Finalize';
        }
    };
}
$$('.finalize-gift-btn').forEach(bindFinalizeGiftBtn);

$('#openSuggestGiftBtn')?.addEventListener('click', () => {
    if (userSuggestionsCount >= MAX_SUGGESTIONS) {
        showToast('You have reached the maximum limit of 2 suggestions.');
        return;
    }
    const form = $('#suggestGiftForm');
    if (form) form.reset();
    openModal('#suggestGiftOverlay', $('#openSuggestGiftBtn'));
});

$('.close-suggest-btn')?.addEventListener('click', () => closeModal());

$('#suggestGiftForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!window.currentUser || !window.currentDashboardGoal) return;

    if (userSuggestionsCount >= MAX_SUGGESTIONS) {
        showToast('You have reached the maximum limit of 2 suggestions.');
        closeModal();
        return;
    }

    const name = $('#giftNameInput')?.value.trim();
    const price = Number($('#giftPriceInput')?.value);
    const link = $('#giftLinkInput')?.value.trim();

    if (!name) {
        showToast('Please enter the gift name.');
        $('#giftNameInput')?.focus();
        return;
    }

    if (!price || price < 50) {
        showToast('Please enter an estimated price of at least ₹50.');
        $('#giftPriceInput')?.focus();
        return;
    }

    const submitBtn = $('#suggestGiftForm button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const { data: inserted, error } = await sb.from('gift_suggestions').insert({
        goal_id: window.currentDashboardGoal.goalId,
        user_id: window.currentUser.id,
        name: name,
        price: price,
        link: link || null
    }).select().single();

    if (submitBtn) submitBtn.disabled = false;

    if (error) {
        showToast('Failed to suggest gift.');
        return;
    }

    showToast(`Gift "${name}" suggested!`);
    closeModal();
    if (typeof loadMyGoals === 'function') loadMyGoals();
});

// Group decision voting
$('#approveDecisionBtn')?.addEventListener('click', () => {
    showToast('Group decisions are not yet connected to the database.');
});

$('#declineDecisionBtn')?.addEventListener('click', () => {
    showToast('Group decisions are not yet connected to the database.');
});

// Goal completion
$('#completeGoalBtn')?.addEventListener('click', () => {
    openModal('#completeGoalOverlay', $('#completeGoalBtn'));
});

$('#confirmCompleteBtn')?.addEventListener('click', () => {
    // Use real collected amount from the currently displayed goal
    const firstGoal = Object.values(sampleGoals)[0];
    const collected = firstGoal ? firstGoal.collected : 0;
    showToast(`Goal marked as completed! ₹${collected.toLocaleString('en-IN')} ready for distribution.`);
    closeModal();
    const tag = $('#mainGoalOccasion');
    if (tag) tag.textContent = tag.textContent.replace('Active', 'Completed');
});

// Help Someone cause filtering and search
$$('.help-tools .tabs button').forEach(btn => {
    btn.onclick = () => {
        $$('.help-tools .tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.dataset.category;
        $$('.request').forEach(card => {
            card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
        });
    };
});

$('#helpSearch')?.addEventListener('input', e => {
    const query = e.target.value.toLowerCase().trim();
    $$('.request').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
});

$$('[data-share]').forEach(btn => {
    btn.onclick = () => {
        const title = btn.dataset.share || 'SharedGoal';
        navigator.clipboard?.writeText(window.location.href);
        showToast(`Link for "${title}" copied to clipboard!`);
    };
});

// Help request submission
$('#createHelpBtn')?.addEventListener('click', () => openModal('#helpOverlay', $('#createHelpBtn')));
$('#bottomHelpBtn')?.addEventListener('click', () => openModal('#helpOverlay', $('#bottomHelpBtn')));

$('#submitHelpBtn')?.addEventListener('click', async () => {
    const title = $('#helpTitle')?.value.trim();
    const story = $('#helpStory')?.value.trim();
    const amount = Number($('#helpAmount')?.value);
    const category = $('#helpCategory')?.value || 'assistance';

    if (!title) {
        showToast('Please enter a request title.');
        $('#helpTitle')?.focus();
        return;
    }
    if (!story) {
        showToast('Please describe the situation.');
        $('#helpStory')?.focus();
        return;
    }
    if (!amount || amount < 500) {
        showToast('Please enter a valid target amount.');
        $('#helpAmount')?.focus();
        return;
    }

    if (!window.currentUser) {
        sessionStorage.setItem('pendingHelpRequest', JSON.stringify({
            data: {
                title: $('#helpTitle')?.value || '',
                category: $('#helpCategory')?.value || 'assistance',
                story: $('#helpStory')?.value || '',
                amount: $('#helpAmount')?.value || ''
            }
        }));
        showToast('Please sign in to submit a help request.');
        closeModal();
        openModal('#loginOverlay');
        return;
    }

    const btn = $('#submitHelpBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const { error } = await sb.from('help_requests').insert({
        user_id: window.currentUser.id,
        title,
        story,
        category,
        target_amount: amount,
        status: 'Pending'
    });

    btn.disabled = false;
    btn.textContent = 'Submit for Verification';

    if (error) {
        showToast('Failed to submit request. Please try again.');
        return;
    }

    sessionStorage.removeItem('pendingHelpRequest');
    showToast('Verification submitted! Your request will be reviewed within 24 hours.');
    closeModal();
    $('#helpTitle') && ($('#helpTitle').value = '');
    $('#helpStory') && ($('#helpStory').value = '');
    $('#helpAmount') && ($('#helpAmount').value = '');
});

// Load verified help requests from Supabase
async function loadHelpRequests() {
    const grid = $('.request-grid');
    if (!grid) return;

    const { data: requests, error } = await sb
        .from('help_requests')
        .select('id, user_id, title, category, story, target_amount, collected_amount, status, deadline')
        .eq('status', 'Verified')
        .order('created_at', { ascending: false });

    if (error || !requests?.length) return; // keep static demo cards

    // Get pending contributions for requests owned by current user
    const userRequestIds = window.currentUser ? requests.filter(r => r.user_id === window.currentUser.id).map(r => r.id) : [];
    let pendingContributions = [];
    if (userRequestIds.length > 0) {
        const { data: pending } = await sb
            .from('contributions')
            .select('id, help_request_id, amount, payment_method, status')
            .in('help_request_id', userRequestIds)
            .eq('status', 'Pending');
        if (pending) pendingContributions = pending;
    }

    grid.innerHTML = '';
    requests.forEach(r => {
        const article = document.createElement('article');
        article.className = 'request';
        article.dataset.category = r.category?.toLowerCase() || 'assistance';

        let pendingHtml = '';
        if (window.currentUser && r.user_id === window.currentUser.id) {
            const requestPending = pendingContributions.filter(c => c.help_request_id === r.id);
            if (requestPending.length > 0) {
                pendingHtml = `
                    <div class="pending-contributions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                        <h4 style="margin-bottom: 0.5rem; font-size: 0.875rem;">Pending Contributions (Only visible to you)</h4>
                        ${requestPending.map(c => `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; background: var(--bg-secondary, #f8f9fa); padding: 0.5rem; border-radius: 4px; font-size: 0.875rem;">
                                <div>
                                    <strong>₹${Number(c.amount).toLocaleString('en-IN')}</strong> via ${c.payment_method || 'Unknown'}
                                </div>
                                <button class="btn small" data-confirm-contribution="${c.id}" style="padding: 0.25rem 0.5rem;">Confirm</button>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        article.innerHTML = `
            <div class="request-img-wrap">
                <img src="${categoryImages[(r.category || '').trim().toLowerCase()] || 'assets/images/help-01-education.png'}" alt="${r.title}">
            </div>
            <div>
                <span class="eyebrow">✓ VERIFIED · ${(r.category || 'General').toUpperCase()}</span>
                <h3>${r.title}</h3>
                <p>${r.story}</p>
                <div class="bar"><i style="width: ${Math.min(100, Math.round((Number(r.collected_amount || 0) / Number(r.target_amount || 1)) * 100))}%"></i></div>
                <div class="request-meta">
                    <strong>₹${Number(r.collected_amount || 0).toLocaleString('en-IN')} of ₹${Number(r.target_amount).toLocaleString('en-IN')}</strong>
                    <span>${r.deadline ? Math.max(0, Math.ceil((new Date(r.deadline) - new Date()) / 86400000)) + ' days left' : 'Open'}</span>
                </div>
                <div class="request-actions">
                    <button class="btn small" data-contribute="${r.title}" data-help-id="${r.id}">Contribute</button>
                    <button class="btn small ghost" data-share="${r.title}">Share</button>
                </div>
                ${pendingHtml}
            </div>
        `;
        grid.appendChild(article);
    });

    // Re-bind contribute/share on new cards
    $$('[data-contribute]').forEach(btn => {
        btn.onclick = () => {
            currentContributeGoalId = btn.dataset.contributeId || null;
            currentContributeHelpId = btn.dataset.helpId || null;
            const titleEl = $('#contributionGoal');
            if (titleEl) titleEl.textContent = btn.dataset.contribute || 'Goal';
            openModal('#contributionOverlay', btn);
        };
    });
    $$('[data-share]').forEach(btn => {
        btn.onclick = () => {
            navigator.clipboard?.writeText(window.location.href);
            showToast(`Link for "${btn.dataset.share}" copied to clipboard!`);
        };
    });

    // Bind confirm contribution buttons
    $$('[data-confirm-contribution]').forEach(btn => {
        btn.onclick = async () => {
            btn.disabled = true;
            btn.textContent = 'Confirming...';
            const contributionId = btn.dataset.confirmContribution;
            const { error } = await sb.rpc('confirm_help_contribution', {
                target_contribution_id: Number(contributionId)
            });

            if (error) {
                console.error('Confirm help contribution:', error);
                showToast('Failed to confirm contribution. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Confirm';
                return;
            }

            showToast('Contribution confirmed successfully.');
            loadHelpRequests(); // Refresh
        };
    });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

window.currentUser = null;

function updateAuthUI() {
    const user = window.currentUser;
    const profileBtns = $$('.user-profile-btn[data-profile]');

    // Helper: set text in all matching IDs across pages
    const setModal = (id, val) => { const el = $(id); if (el) el.textContent = val; };

    if (!user) {
        $$('.user-avatar-circle').forEach(el => el.textContent = '');
        $$('.user-profile-btn .name').forEach(el => el.textContent = 'Sign In');
        $$('.menu-user-card strong').forEach(el => el.textContent = '');
        $$('.menu-user-card small').forEach(el => el.textContent = '');
        profileBtns.forEach(btn => { btn.onclick = () => openModal('#loginOverlay', btn); });
        // Clear profile modal fields across all pages
        ['profileTitle', 'profileTitleMyGoals', 'profileTitleHelp'].forEach(id => setModal('#' + id, ''));
        ['profileEmail', 'profileEmailMyGoals', 'profileEmailHelp'].forEach(id => setModal('#' + id, ''));
        ['profileCreated', 'profileCreatedMyGoals', 'profileCreatedHelp'].forEach(id => setModal('#' + id, '—'));
        ['profileJoined', 'profileJoinedMyGoals', 'profileJoinedHelp'].forEach(id => setModal('#' + id, '—'));
        ['profileContributed', 'profileContributedMyGoals', 'profileContributedHelp'].forEach(id => setModal('#' + id, '—'));
        
        $$('.dropdown-signout-btn').forEach(btn => {
            btn.textContent = 'Sign In';
            btn.onclick = () => openModal('#loginOverlay', btn);
        });
        return;
    }

    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
    const initial = name[0]?.toUpperCase() || '?';
    $$('.user-avatar-circle').forEach(el => el.textContent = initial);
    $$('.user-profile-btn .name').forEach(el => el.textContent = name);
    $$('.menu-user-card strong').forEach(el => el.textContent = name);
    $$('.menu-user-card small').forEach(el => el.textContent = user.email);
    profileBtns.forEach(btn => { btn.onclick = () => openModal('#profileOverlay', btn); });

    // Populate profile modal identity
    ['profileTitle', 'profileTitleMyGoals', 'profileTitleHelp'].forEach(id => setModal('#' + id, name));
    ['profileEmail', 'profileEmailMyGoals', 'profileEmailHelp'].forEach(id => setModal('#' + id, user.email));

    // Fetch live stats for the profile modal
    (async () => {
        const uid = user.id;

        const [createdRes, joinedRes, contribRes] = await Promise.all([
            sb.from('goals').select('id', { count: 'exact', head: true }).eq('creator_id', uid),
            sb.from('goal_members').select('id', { count: 'exact', head: true }).eq('user_id', uid),
            sb.from('contributions').select('amount').eq('user_id', uid).eq('status', 'Confirmed')
        ]);

        const created = createdRes.count ?? 0;
        const joined = joinedRes.count ?? 0;
        const contributed = (contribRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
        const contribLabel = contributed >= 1000
            ? '₹' + (contributed / 1000).toFixed(contributed % 1000 === 0 ? 0 : 1) + 'k'
            : '₹' + contributed;

        ['profileCreated', 'profileCreatedMyGoals', 'profileCreatedHelp'].forEach(id => setModal('#' + id, created));
        ['profileJoined', 'profileJoinedMyGoals', 'profileJoinedHelp'].forEach(id => setModal('#' + id, joined));
        ['profileContributed', 'profileContributedMyGoals', 'profileContributedHelp'].forEach(id => setModal('#' + id, contribLabel));
    })();

    $$('.dropdown-signout-btn').forEach(btn => {
        btn.textContent = 'Sign Out';
        btn.onclick = () => sb.auth.signOut().then(() => window.location.reload());
    });
}

// Wire Google sign-in button(s)
$$('.google-btn:not(#step5Next)').forEach(btn => {
    btn.onclick = () => sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
    });
});

// Auth state: fires on load and on sign-in / sign-out
sb.auth.onAuthStateChange((_event, session) => {
    window.currentUser = session?.user ?? null;
    updateAuthUI();
});

// Deep link join flow for Private Invitations
async function handleDeepLinkJoin() {
    const params = new URLSearchParams(window.location.search);
    let inviteToken = params.get('invite');

    // Check for pending invite from OAuth resume
    if (!inviteToken) {
        inviteToken = sessionStorage.getItem('pendingInvite');
        if (!inviteToken) return;
    }

    if (!window.currentUser) {
        // Unauthenticated -> store token and trigger Google OAuth
        sessionStorage.setItem('pendingInvite', inviteToken);
        openModal('#loginOverlay');
        return;
    }

    // Call the secure database RPC to process acceptance

    const { error } = await sb.rpc('accept_goal_invitation', { invite_token: inviteToken });

    if (error) {
        console.error("Invitation acceptance failed:", error);

        // Handle specific RPC error messages elegantly
        if (error.message.includes('match logged-in user')) {
            showToast('This invitation is for a different email address. Please sign in with the invited account.');
        } else {
            showToast('This invitation is invalid or has already been accepted.');
            window.history.replaceState({}, '', window.location.pathname); 
        }
        return;
    }

    // Success! Clear URL params and render the dashboard
    showToast('You have successfully joined the goal!');
    window.history.replaceState({}, '', window.location.pathname);
    sessionStorage.removeItem('pendingInvite');
    if ($('#mainGoalTitle')) loadMyGoals();
}

async function loadNotifications() {
    if (!window.currentUser) return;

    const { data, error } = await sb.from('notifications')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .order('created_at', { ascending: false });

    if (error || !data) return;

    const unreadCount = data.filter(n => !n.is_read).length;
    const badges = $$('.notif-badge');
    badges.forEach(b => {
        if (unreadCount > 0) {
            b.style.display = 'block';
            b.textContent = unreadCount;
        } else {
            b.style.display = 'none';
        }
    });

    const notesContainer = $('#notificationsOverlay .notes');
    if (notesContainer) {
        notesContainer.innerHTML = '';
        if (data.length === 0) {
            notesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No notifications yet.</div>';
            return;
        }

        data.forEach(n => {
            const item = document.createElement('div');
            item.className = `note-item ${n.is_read ? '' : 'unread'}`;

            const timeStr = new Date(n.created_at).toLocaleDateString('en-IN', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            item.innerHTML = `
                <strong>${n.message}</strong>
                <small>${timeStr}</small>
            `;

            item.onclick = async () => {
                if (!n.is_read) {
                    item.classList.remove('unread');
                    n.is_read = true;

                    const remainingUnread = parseInt(badges[0]?.textContent || 0) - 1;
                    badges.forEach(b => {
                        if (remainingUnread > 0) {
                            b.textContent = remainingUnread;
                        } else {
                            b.style.display = 'none';
                        }
                    });

                    await sb.from('notifications').update({ is_read: true }).eq('id', n.id);
                }
            };

            notesContainer.appendChild(item);
        });
    }
}

function restorePendingCreateGoal() {
    const saved = sessionStorage.getItem('pendingCreateGoal');
    if (!saved) return;
    try {
        const state = JSON.parse(saved);
        if (state && state.data) {
            Object.assign(goalData, state.data);

            // Re-populate DOM inputs
            const customWrap = $('#customCategoryWrap');
            const customOccasionInput = $('#customOccasionInput');
            if (goalData.occasion === 'Custom') {
                if (customWrap) customWrap.style.display = 'block';
                if (customOccasionInput) customOccasionInput.value = goalData.customOccasion || '';
            }

            $$('#step1Choices button').forEach(b => b.classList.toggle('selected', b.dataset.value === goalData.occasion));
            if ($('#goalName')) $('#goalName').value = goalData.name || '';
            if ($('#goalDesc')) $('#goalDesc').value = goalData.description || '';
            if ($('#goalAmount')) $('#goalAmount').value = goalData.target || '';
            if ($('#goalDeadline')) $('#goalDeadline').value = goalData.deadline || '';

            $$('#styleChoices button').forEach(b => b.classList.toggle('selected', b.dataset.value === goalData.style));
            $$('#visibilityChoices button').forEach(b => b.classList.toggle('selected', b.dataset.value === goalData.visibility));

            updateReviewScreen();

            const nextStep = goalData.visibility === 'Public' ? 7 : 6;
            currentStep = nextStep;

            openModal('#createGoalOverlay');
            goToStep(nextStep);
        }
    } catch (e) {
        console.error('Failed to restore wizard state', e);
    }
}

function restorePendingHelpRequest() {
    const saved = sessionStorage.getItem('pendingHelpRequest');
    if (!saved) return;
    try {
        const state = JSON.parse(saved);
        if (state && state.data) {
            if ($('#helpTitle')) $('#helpTitle').value = state.data.title ?? '';
            if ($('#helpCategory')) $('#helpCategory').value = state.data.category ?? 'assistance';
            if ($('#helpStory')) $('#helpStory').value = state.data.story ?? '';
            if ($('#helpAmount')) $('#helpAmount').value = state.data.amount ?? '';

            openModal('#helpOverlay');
        }
    } catch (e) {
        console.error('Failed to restore Help Request state', e);
    }
}

// Bootstrap on page load
sb.auth.getSession().then(({ data: { session } }) => {
    window.currentUser = session?.user ?? null;
    updateAuthUI();

    handleDeepLinkJoin();

    if (session) {
        restorePendingCreateGoal();
        restorePendingHelpRequest();
        loadNotifications();
    }
    if ($('#mainGoalTitle')) loadMyGoals();
    if ($('.request-grid')) loadHelpRequests();
});
