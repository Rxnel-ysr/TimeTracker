// TaskTimerApp.js
import { html } from "../DSL-VDOM/core/vdom.js";
import { useState, useEffect, useRef } from "../DSL-VDOM/core/vdom.hooks.js";

const App = () => {
    const [taskName, setTaskName] = useState("");
    const [tasks, setTasks] = useState([]);
    const [activeTask, setActiveTask] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const vid = useRef(null);

    // --- COLORS & STYLES ---
    const colors = {
        primary: "#000000",
        secondary: "#1a1a1a",
        accent: "#ffffff",
        accentMuted: "rgba(255,255,255,0.7)",
        gold: "#d4af37",
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
        purple: "#8b5cf6",
        info: "#3b82f6",
        pending: "#f97316", // Orange for pending
        cardBg: "rgba(26, 26, 26, 0.9)",
    };

    const gradients = {
        primary: "linear-gradient(135deg, #000000 0%, #2d1b69 100%)",
        card: "linear-gradient(145deg, rgba(26,26,26,0.95) 0%, #000000 100%)",
        timer: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
        success: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        info: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        pending: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", // Orange gradient
    };

    // --- BACKGROUND EFFECT ---
    useEffect(() => {
        const updateBg = () => {
            const hour = new Date().getHours();
            const bgs = [
                "linear-gradient(135deg, #000000 0%, #1e3a8a 100%)",
                "linear-gradient(135deg, #000000 0%, #374151 100%)",
                "linear-gradient(135deg, #000000 0%, #1e1b4b 100%)",
                "linear-gradient(135deg, #000000 0%, #000000 100%)",
            ];
            document.body.style.background = bgs[Math.floor(hour / 6)];
            document.body.style.minHeight = "100vh";
            document.body.style.margin = "0";
        };
        updateBg();
        const int = setInterval(updateBg, 60000);
        return () => clearInterval(int);
    }, []);

    useEffect(() => {
        const v = vid.current;
        if (!v) return;

        if (isRunning) {
            const tryPlay = () => {
                v.play().catch(() => {
                    setTimeout(tryPlay, 100);
                });
            };
            tryPlay();
        } else {
            v.pause();
            v.currentTime = 0;
        }
    }, [isRunning]);

    // --- LOAD TASKS ---
    useEffect(() => {
        const saved = localStorage.getItem("taskTimerTasks");
        if (saved) {
            const loadedTasks = JSON.parse(saved);
            setTasks(loadedTasks);

            // If there was an active task when the app was closed, restore it
            const lastActiveTask = loadedTasks.find(t => !t.completed && t.isActive === true);
            if (lastActiveTask) {
                setActiveTask(lastActiveTask.id);
                setElapsedTime(lastActiveTask.elapsedTime || 0);
            }
        }
    }, []);

    // --- SAVE TASKS ---
    useEffect(() => {
        const tasksToSave = tasks.map(task => ({
            ...task,
            // Add isActive flag for persistence
            isActive: task.id === activeTask
        }));
        localStorage.setItem("taskTimerTasks", JSON.stringify(tasksToSave));
    }, [tasks, activeTask]);

    // --- TIMER LOOP ---
    useEffect(() => {
        if (!isRunning || activeTask == null) return;

        const id = setInterval(() => {
            setElapsedTime(t => t + 1);

            // Update the task's elapsed time in state
            setTasks(prev => prev.map(t =>
                t.id === activeTask
                    ? { ...t, elapsedTime: (t.elapsedTime || 0) + 1 }
                    : t
            ));
        }, 1000);

        return () => clearInterval(id);
    }, [isRunning, activeTask]);

    // --- HELPER FUNCTIONS ---
    const format = s => {
        const h = String(Math.floor(s / 3600)).padStart(2, "0");
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
        const sec = String(s % 60).padStart(2, "0");
        return `${h}:${m}:${sec}`;
    };

    const startStop = () => {
        if (activeTask == null) {
            // Create new task
            const newTask = {
                id: Date.now(),
                name: taskName.trim() || `Task ${tasks.length + 1}`,
                startTime: new Date().toISOString(),
                elapsedTime: 0,
                completed: false,
                lastActive: new Date().toISOString(), // Track when last active
            };

            setTasks(prev => [...prev, newTask]);
            setActiveTask(newTask.id);
            setElapsedTime(0);
            setTaskName("");
        }
        setIsRunning(v => !v);
    };

    const continueTask = (taskId) => {
        const taskToContinue = tasks.find(t => t.id === taskId);
        if (!taskToContinue) return;

        setActiveTask(taskId);
        setElapsedTime(taskToContinue.elapsedTime || 0);
        setTaskName(""); // Clear input field since we're continuing existing task
        setIsRunning(false); // Start paused, user can click to resume
    };

    const completeTask = () => {
        if (!activeTask) return;

        setTasks(prev =>
            prev.map(t =>
                t.id === activeTask
                    ? {
                        ...t,
                        completed: true,
                        elapsedTime: t.elapsedTime + elapsedTime, // Update total
                        endTime: new Date().toISOString(),
                        isActive: false
                    }
                    : t
            )
        );

        setActiveTask(null);
        setIsRunning(false);
        setElapsedTime(0);
    };

    // NEW: Set active task as pending
    const setAsPending = () => {
        if (!activeTask) return;

        // Update the task's elapsed time with current session
        setTasks(prev =>
            prev.map(t =>
                t.id === activeTask
                    ? {
                        ...t,
                        elapsedTime: t.elapsedTime + elapsedTime,
                        lastActive: new Date().toISOString(),
                        isActive: false
                    }
                    : t
            )
        );

        setActiveTask(null);
        setIsRunning(false);
        setElapsedTime(0);
        setTaskName("");
    };

    const reset = () => {
        setActiveTask(null);
        setElapsedTime(0);
        setIsRunning(false);
        setTaskName("");
    };

    const removeTask = id => {
        setTasks(prev => prev.filter(t => t.id !== id));
        if (id === activeTask) reset();
    };

    // --- DATA ---
    const activeTaskObj = tasks.find(t => t.id === activeTask);
    const completed = tasks.filter(t => t.completed);
    const pending = tasks.filter(t => !t.completed && t.id !== activeTask);
    const totalTime = tasks.reduce((sum, t) => sum + (t.elapsedTime || 0), 0);

    // Sort pending tasks by last active time (most recent first)
    const sortedPending = [...pending].sort((a, b) => {
        const timeA = new Date(a.lastActive || a.startTime).getTime();
        const timeB = new Date(b.lastActive || b.startTime).getTime();
        return timeB - timeA;
    });

    return html.div(
        {
            style: {
                padding: "2rem",
                color: colors.accent,
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                maxWidth: "1200px",
                margin: "0 auto",
                minHeight: "92dvh",
            }
        },

        // HEADER
        html.div(
            {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    paddingBottom: "2rem",
                    borderBottom: `1px solid rgba(255,255,255,0.1)`,
                },
            },
            [
                html.div(
                    {},
                    [
                        html.h1(
                            {
                                style: {
                                    fontSize: "2.5rem",
                                    fontWeight: "300",
                                    margin: "0 0 0.5rem 0",
                                    background: `linear-gradient(135deg, ${colors.accent} 30%, ${colors.gold} 100%)`,
                                    backgroundClip: "text",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }
                            },
                            "Backlog..."
                        ),
                        html.div(
                            { style: { color: colors.accentMuted, fontSize: "0.9rem" } },
                            "Anda bingung ngisi backlog? yaudah, bukan urusan saya"
                        ),
                    ]
                ),

                // STATS
                html.div(
                    {
                        style: {
                            display: "flex",
                            gap: "1rem",
                        },
                    },
                    [
                        html.div(
                            {
                                style: {
                                    padding: "1rem 1.5rem",
                                    background: "rgba(255,255,255,0.05)",
                                    borderRadius: "12px",
                                    border: `1px solid rgba(255,255,255,0.1)`,
                                    minWidth: "120px",
                                },
                            },
                            [
                                html.div(
                                    { style: { fontSize: "1.8rem", fontWeight: "600" } },
                                    completed.length
                                ),
                                html.div(
                                    { style: { color: colors.accentMuted, fontSize: "0.8rem" } },
                                    "Completed"
                                ),
                            ]
                        ),
                        html.div(
                            {
                                style: {
                                    padding: "1rem 1.5rem",
                                    background: "rgba(255,255,255,0.05)",
                                    borderRadius: "12px",
                                    border: `1px solid rgba(255,255,255,0.1)`,
                                    minWidth: "120px",
                                },
                            },
                            [
                                html.div(
                                    { style: { fontSize: "1.8rem", fontWeight: "600" } },
                                    pending.length + (activeTask ? 1 : 0)
                                ),
                                html.div(
                                    { style: { color: colors.accentMuted, fontSize: "0.8rem" } },
                                    "Pending"
                                ),
                            ]
                        ),
                        html.div(
                            {
                                style: {
                                    padding: "1rem 1.5rem",
                                    background: "rgba(255,255,255,0.05)",
                                    borderRadius: "12px",
                                    border: `1px solid rgba(255,255,255,0.1)`,
                                    minWidth: "120px",
                                },
                            },
                            [
                                html.div(
                                    { style: { fontSize: "1.8rem", fontWeight: "600" } },
                                    format(totalTime).split(':')[0] + 'h'
                                ),
                                html.div(
                                    { style: { color: colors.accentMuted, fontSize: "0.8rem" } },
                                    "Total Time"
                                ),
                            ]
                        ),
                    ]
                ),
            ]
        ),

        // MAIN CONTENT
        html.div(
            {
                style: {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2rem",
                    marginTop: "2rem",
                },
            },
            [
                // LEFT COLUMN - TIMER
                html.div(
                    {},
                    [
                        // TIMER CARD
                        html.div(
                            {
                                style: {
                                    background: gradients.card,
                                    backdropFilter: "blur(20px)",
                                    borderRadius: "20px",
                                    padding: "2rem",
                                    border: `1px solid rgba(255,255,255,0.1)`,
                                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                                },
                            },
                            [
                                html.div(
                                    {
                                        style: {
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.75rem",
                                            marginBottom: "1.5rem",
                                        }
                                    },
                                    [
                                        html.div(
                                            {
                                                style: {
                                                    width: "4px",
                                                    height: "24px",
                                                    background: activeTask ? colors.gold : colors.accentMuted,
                                                    borderRadius: "2px",
                                                }
                                            }
                                        ),
                                        html.h2(
                                            {
                                                style: {
                                                    margin: "0",
                                                    fontSize: "1.5rem",
                                                    fontWeight: "500",
                                                    color: activeTask ? colors.accent : colors.accentMuted,
                                                }
                                            },
                                            activeTaskObj ? `${activeTaskObj.name}` : "Start a New Task"
                                        ),
                                    ]
                                ),

                                // TIMER DISPLAY
                                html.div(
                                    {
                                        style: {
                                            fontSize: "4.5rem",
                                            fontWeight: "200",
                                            textAlign: "center",
                                            margin: "2rem 0",
                                            background: activeTask ? gradients.timer : "rgba(255,255,255,0.3)",
                                            backgroundClip: "text",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent",
                                            fontFamily: "'Roboto Mono', monospace",
                                            opacity: activeTask ? 1 : 0.5,
                                        }
                                    },
                                    format(elapsedTime)
                                ),

                                activeTaskObj &&
                                html.div(
                                    {
                                        style: {
                                            textAlign: "center",
                                            color: isRunning ? colors.success : colors.warning,
                                            fontSize: "1.1rem",
                                            marginBottom: "1.5rem",
                                            fontWeight: "500",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "0.5rem",
                                        }
                                    },
                                    [
                                        isRunning ? "Timer Running" : "Timer Paused",
                                        html.span(
                                            { style: { color: colors.accentMuted, fontSize: "0.9rem" } },
                                            ` (Session: ${format(elapsedTime)})`
                                        ),
                                    ]
                                ),

                                // INPUT (only shown when no active task)
                                !activeTask && html.div(
                                    { style: { marginBottom: "2rem" } },
                                    [
                                        html.input({
                                            type: "text",
                                            value: taskName,
                                            placeholder: "Enter task name...",
                                            oninput: e => setTaskName(e.target.value),
                                            style: {
                                                width: "100%",
                                                padding: "1rem 1.5rem",
                                                borderRadius: "12px",
                                                border: `1px solid rgba(255,255,255,0.2)`,
                                                background: "rgba(0,0,0,0.3)",
                                                color: colors.accent,
                                                fontSize: "1rem",
                                                outline: "none",
                                                boxSizing: "border-box",
                                            },
                                        }),
                                        html.div(
                                            {
                                                style: {
                                                    color: colors.accentMuted,
                                                    fontSize: "0.8rem",
                                                    marginTop: "0.5rem",
                                                    paddingLeft: "0.5rem",
                                                }
                                            },
                                            "Name your task before starting"
                                        ),
                                    ]
                                ),

                                // BUTTONS
                                html.div(
                                    {
                                        style: {
                                            display: "flex",
                                            gap: "1rem",
                                            justifyContent: "center",
                                            flexWrap: "wrap",
                                        }
                                    },
                                    [
                                        // Start/Stop/Pause/Resume button
                                        html.button(
                                            {
                                                onClick: startStop,
                                                style: {
                                                    padding: "1rem 2rem",
                                                    borderRadius: "12px",
                                                    border: "none",
                                                    background: activeTask
                                                        ? (isRunning ? colors.danger : colors.success)
                                                        : (taskName.trim() ? colors.success : colors.accentMuted),
                                                    color: colors.accent,
                                                    cursor: activeTask || taskName.trim() ? "pointer" : "not-allowed",
                                                    fontWeight: "600",
                                                    fontSize: "1rem",
                                                    backdropFilter: "blur(10px)",
                                                    border: `1px solid ${activeTask
                                                        ? (isRunning ? colors.danger : colors.success)
                                                        : (taskName.trim() ? colors.success : colors.accentMuted)}30`,
                                                    transition: "all 0.2s",
                                                    opacity: activeTask || taskName.trim() ? 1 : 0.6,
                                                    minWidth: "140px",
                                                },
                                            },
                                            activeTask
                                                ? (isRunning ? "Pause" : "Resume")
                                                : "Start New Task"
                                        ),

                                        // Complete button (only when active task)
                                        activeTask && html.button(
                                            {
                                                onclick: completeTask,
                                                style: {
                                                    padding: "1rem 2rem",
                                                    borderRadius: "12px",
                                                    border: "none",
                                                    background: gradients.success,
                                                    color: colors.accent,
                                                    cursor: "pointer",
                                                    fontWeight: "600",
                                                    fontSize: "1rem",
                                                    backdropFilter: "blur(10px)",
                                                    border: `1px solid rgba(255,255,255,0.2)`,
                                                    transition: "all 0.2s",
                                                    minWidth: "140px",
                                                }
                                            },
                                            "Complete Task"
                                        ),

                                        // Set as Pending button (only when active task)
                                        activeTask && html.button(
                                            {
                                                onclick: setAsPending,
                                                style: {
                                                    padding: "1rem 2rem",
                                                    borderRadius: "12px",
                                                    border: "none",
                                                    background: gradients.pending,
                                                    color: colors.accent,
                                                    cursor: "pointer",
                                                    fontWeight: "600",
                                                    fontSize: "1rem",
                                                    backdropFilter: "blur(10px)",
                                                    border: `1px solid rgba(255,255,255,0.2)`,
                                                    transition: "all 0.2s",
                                                    minWidth: "140px",
                                                }
                                            },
                                            "Set as Pending"
                                        ),

                                        // Reset button (only when active task)
                                        activeTask && html.button(
                                            {
                                                onclick: reset,
                                                style: {
                                                    padding: "1rem 2rem",
                                                    borderRadius: "12px",
                                                    border: "none",
                                                    background: "rgba(255,255,255,0.1)",
                                                    color: colors.accent,
                                                    cursor: "pointer",
                                                    fontWeight: "600",
                                                    fontSize: "1rem",
                                                    backdropFilter: "blur(10px)",
                                                    border: `1px solid rgba(255,255,255,0.2)`,
                                                    transition: "all 0.2s",
                                                    minWidth: "140px",
                                                }
                                            },
                                            "Reset Timer"
                                        ),
                                    ]
                                ),
                            ]
                        ),

                        // ACTIVE TASK INFO
                        activeTaskObj && html.div(
                            {
                                style: {
                                    background: gradients.card,
                                    backdropFilter: "blur(20px)",
                                    borderRadius: "20px",
                                    padding: "1.5rem",
                                    border: `1px solid rgba(255,255,255,0.1)`,
                                    marginTop: "1.5rem",
                                },
                            },
                            [
                                html.div(
                                    {
                                        style: {
                                            color: isRunning ? colors.success : colors.warning,
                                            fontWeight: "500",
                                            marginBottom: "0.5rem",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem"
                                        }
                                    },
                                    [
                                        isRunning ? "Active Timer" : "Timer Paused",
                                    ]
                                ),
                                html.div(
                                    { style: { fontSize: "1.1rem", marginBottom: "0.5rem" } },
                                    activeTaskObj.name
                                ),
                                html.div(
                                    { style: { color: colors.accentMuted, fontSize: "0.9rem" } },
                                    [
                                        `Session time: ${format(elapsedTime)}`,
                                        html.br(),
                                        `Total time: ${format(activeTaskObj.elapsedTime || 0)}`,
                                        html.br(),
                                        `Started: ${new Date(activeTaskObj.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                                    ]
                                ),
                            ]
                        ),

                        // NO ACTIVE TASK MESSAGE
                        !activeTask && pending.length > 0 && html.div(
                            {
                                style: {
                                    background: gradients.card,
                                    backdropFilter: "blur(20px)",
                                    borderRadius: "20px",
                                    padding: "1.5rem",
                                    border: `1px solid rgba(255,255,255,0.1)`,
                                    marginTop: "1.5rem",
                                    textAlign: "center",
                                },
                            },
                            [
                                html.div(
                                    { style: { color: colors.warning, fontWeight: "500", marginBottom: "0.5rem" } },
                                    "Pending Tasks Available"
                                ),
                                html.div(
                                    { style: { color: colors.accentMuted, fontSize: "0.9rem" } },
                                    `You have ${pending.length} pending task${pending.length !== 1 ? 's' : ''}. Click "Continue" on any task to resume tracking.`
                                ),
                            ]
                        ),
                    ]
                ),

                // RIGHT COLUMN - TASKS
                html.div(
                    {
                        style: {
                            background: gradients.card,
                            backdropFilter: "blur(20px)",
                            borderRadius: "20px",
                            padding: "2rem",
                            border: `1px solid rgba(255,255,255,0.1)`,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                            maxHeight: "calc(100vh - 200px)",
                            overflowY: "auto",
                        },
                    },
                    [
                        html.div(
                            {
                                style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    marginBottom: "1.5rem",
                                }
                            },
                            [
                                html.div(
                                    {
                                        style: {
                                            width: "4px",
                                            height: "24px",
                                            background: colors.gold,
                                            borderRadius: "2px",
                                        }
                                    }
                                ),
                                html.h2(
                                    {
                                        style: {
                                            margin: "0",
                                            fontSize: "1.5rem",
                                            fontWeight: "500",
                                        }
                                    },
                                    "Task History"
                                ),
                            ]
                        ),

                        // PENDING TASKS
                        sortedPending.length > 0 && html.div(
                            { style: { marginBottom: "2rem" } },
                            [
                                html.div(
                                    {
                                        style: {
                                            color: colors.pending,
                                            fontSize: "0.9rem",
                                            fontWeight: "600",
                                            marginBottom: "0.75rem",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                        }
                                    },
                                    `Pending Tasks (${sortedPending.length})`
                                ),
                                ...sortedPending.map(t =>
                                    html.div(
                                        {
                                            style: {
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "1rem",
                                                background: "rgba(255,255,255,0.03)",
                                                borderRadius: "12px",
                                                marginBottom: "0.75rem",
                                                border: `1px solid ${colors.pending}30`,
                                                transition: "all 0.2s",
                                            },
                                            onmouseenter: e => {
                                                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                                e.currentTarget.style.transform = "translateY(-2px)";
                                            },
                                            onmouseleave: e => {
                                                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                                e.currentTarget.style.transform = "translateY(0)";
                                            },
                                        },
                                        [
                                            html.div(
                                                { style: { display: "flex", flexDirection: "column", gap: "0.25rem" } },
                                                [
                                                    html.div(
                                                        { style: { display: "flex", alignItems: "center", gap: "0.5rem" } },
                                                        [
                                                            html.span({ style: { fontWeight: "500" } }, t.name),
                                                            t.lastActive && html.span(
                                                                {
                                                                    style: {
                                                                        color: colors.accentMuted,
                                                                        fontSize: "0.7rem",
                                                                        background: "rgba(249,115,22,0.1)",
                                                                        padding: "0.1rem 0.4rem",
                                                                        borderRadius: "4px",
                                                                    }
                                                                },
                                                                `Last: ${new Date(t.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                            ),
                                                        ]
                                                    ),
                                                    html.span(
                                                        { style: { color: colors.accentMuted, fontSize: "0.8rem" } },
                                                        `Total: ${format(t.elapsedTime || 0)}`
                                                    ),
                                                ]
                                            ),
                                            html.div(
                                                { style: { display: "flex", gap: "0.5rem" } },
                                                [
                                                    html.button(
                                                        {
                                                            onclick: () => continueTask(t.id),
                                                            style: {
                                                                padding: "0.5rem 1rem",
                                                                borderRadius: "8px",
                                                                border: "none",
                                                                background: gradients.info,
                                                                color: colors.accent,
                                                                cursor: "pointer",
                                                                fontSize: "0.8rem",
                                                                fontWeight: "500",
                                                                transition: "all 0.2s",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "0.25rem",
                                                            }
                                                        },
                                                        [
                                                            html.span({ style: { fontSize: "0.7rem" } }, "Continue")
                                                        ]
                                                    ),
                                                    html.button(
                                                        {
                                                            onclick: () => removeTask(t.id),
                                                            style: {
                                                                padding: "0.5rem 1rem",
                                                                borderRadius: "8px",
                                                                border: "none",
                                                                background: "rgba(239,68,68,0.1)",
                                                                color: colors.danger,
                                                                cursor: "pointer",
                                                                fontSize: "0.8rem",
                                                                transition: "all 0.2s",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "0.25rem",
                                                            }
                                                        },
                                                        [
                                                            html.span({ style: { fontSize: "0.7rem" } }, "Delete")
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    )
                                ),
                            ]
                        ),

                        // COMPLETED TASKS
                        html.div(
                            {},
                            [
                                html.div(
                                    {
                                        style: {
                                            color: colors.success,
                                            fontSize: "0.9rem",
                                            fontWeight: "600",
                                            marginBottom: "0.75rem",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                        }
                                    },
                                    `Completed Tasks (${completed.length})`
                                ),

                                completed.length === 0 ?
                                    html.div(
                                        {
                                            style: {
                                                textAlign: "center",
                                                color: colors.accentMuted,
                                                padding: "2rem",
                                            }
                                        },
                                        "No completed tasks yet"
                                    ) :
                                    completed.slice().reverse().map(t =>
                                        html.div(
                                            {
                                                style: {
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "1rem",
                                                    background: "rgba(255,255,255,0.03)",
                                                    borderRadius: "12px",
                                                    marginBottom: "0.75rem",
                                                    border: `1px solid rgba(255,255,255,0.1)`,
                                                    transition: "all 0.2s",
                                                },
                                                onmouseenter: e => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                                },
                                                onmouseleave: e => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                                },
                                            },
                                            [
                                                html.div(
                                                    { style: { display: "flex", flexDirection: "column" } },
                                                    [
                                                        html.span({ style: { fontWeight: "500" } }, t.name),
                                                        html.span(
                                                            { style: { color: colors.accentMuted, fontSize: "0.8rem" } },
                                                            `Completed: ${new Date(t.endTime || t.startTime).toLocaleDateString()}`
                                                        ),
                                                    ]
                                                ),
                                                html.div(
                                                    { style: { display: "flex", alignItems: "center", gap: "1rem" } },
                                                    [
                                                        html.span(
                                                            {
                                                                style: {
                                                                    color: colors.success,
                                                                    fontWeight: "600",
                                                                    fontFamily: "'Roboto Mono', monospace",
                                                                }
                                                            },
                                                            format(t.elapsedTime || 0)
                                                        ),
                                                        html.button(
                                                            {
                                                                onclick: () => removeTask(t.id),
                                                                style: {
                                                                    padding: "0.5rem",
                                                                    borderRadius: "6px",
                                                                    border: "none",
                                                                    background: "rgba(239,68,68,0.1)",
                                                                    color: colors.danger,
                                                                    cursor: "pointer",
                                                                    fontSize: "0.8rem",
                                                                }
                                                            },
                                                            "×"
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        )
                                    ),
                            ]
                        ),
                    ]
                ),
            ]
        ),

        // TINY VIDEO FOR KEEPING SCREEN AWAKE
        html.video({
            id: 'awake',
            ref: vid,
            playsinline: true,
            muted: true,
            loop: true,
            style: {
                display: "none",
                width: "1px",
                height: "1px",
                position: "absolute",
                top: "-9999px",
                left: "-9999px"
            }
        }),

        // AUTO-SAVE INDICATOR
        html.div(
            {
                style: {
                    position: "fixed",
                    bottom: "1.5rem",
                    right: "1.5rem",
                    background: "rgba(0,0,0,0.8)",
                    color: activeTask ? (isRunning ? colors.success : colors.warning) : colors.gold,
                    padding: "0.75rem 1.25rem",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: "500",
                    backdropFilter: "blur(20px)",
                    border: `1px solid ${activeTask ? (isRunning ? colors.success : colors.warning) : colors.gold}30`,
                    zIndex: 1000,
                },
            },
            activeTask
                ? (isRunning ? "Timer running" : "Timer paused")
                : "Auto-saved"
        ),
    );
};

export default App;