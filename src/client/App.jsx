import { useCallback, useEffect, useState } from 'react';
import Board from './components/Board.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import ProjectHeader from './components/ProjectHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import LogsPanel from './components/LogsPanel.jsx';
import DocsPanel from './components/DocsPanel.jsx';
import AppShell from './components/AppShell.jsx';
import MobileHeader from './components/MobileHeader.jsx';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [board, setBoard] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const [error, setError] = useState('');
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pipelineWarning, setPipelineWarning] = useState(null);

  const handleProjectsChange = useCallback((nextProjects, preferredProjectId = null) => {
    const normalizedProjects = Array.isArray(nextProjects) ? nextProjects : [];
    setProjects(normalizedProjects);

    setSelectedProjectId((currentProjectId) => {
      if (preferredProjectId && normalizedProjects.some((project) => project.id === preferredProjectId)) {
        return preferredProjectId;
      }

      if (currentProjectId && normalizedProjects.some((project) => project.id === currentProjectId)) {
        return currentProjectId;
      }

      return normalizedProjects[0]?.id ?? null;
    });

    setProjectsLoading(false);
  }, []);

  const handleProjectUpdated = useCallback((updatedProject) => {
    if (!updatedProject?.id) {
      return;
    }

    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === updatedProject.id ? { ...project, ...updatedProject } : project,
      ),
    );

    setSelectedProject((currentProject) => {
      if (!currentProject || currentProject.id !== updatedProject.id) {
        return currentProject;
      }

      return {
        ...currentProject,
        ...updatedProject,
        board: currentProject.board,
      };
    });
  }, []);

  const handleSelectProject = useCallback((projectId) => {
    setSelectedProjectId(projectId);
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      try {
        setProjectsLoading(true);
        setError('');

        const response = await fetch('/api/projects', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load projects (${response.status})`);
        }

        const payload = await response.json();
        handleProjectsChange(payload);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unexpected error');
          setProjectsLoading(false);
        }
      }
    }

    loadProjects();

    return () => controller.abort();
  }, [handleProjectsChange]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      setBoard(null);
      setProjectLoading(false);
      setIsActivityOpen(false);
      setIsSidebarOpen(false);
      setPipelineWarning(null);
      return;
    }

    const controller = new AbortController();
    let intervalId = null;

    async function loadProject(showSpinner = true) {
      try {
        if (showSpinner) setProjectLoading(true);
        setError('');

        const response = await fetch(`/api/projects/${selectedProjectId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load project ${selectedProjectId} (${response.status})`);
        }

        const payload = await response.json();
        setSelectedProject(payload);
        setBoard(payload.board || null);

        const p = payload.pipeline;
        const shouldWarn =
          p &&
          !p.running &&
          (p.staleLock || p.escalated || p.status === 'escalated' || p.status === 'crashed' || p.lastError);

        if (shouldWarn) {
          setPipelineWarning({
            currentStep: p.currentStep,
            status: p.status,
            lastError: p.lastError,
            updatedAt: p.updatedAt,
            staleLock: p.staleLock,
          });
        } else {
          setPipelineWarning(null);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unexpected error');
        }
      } finally {
        if (showSpinner) setProjectLoading(false);
      }
    }

    // Initial load with spinner, then poll for live updates.
    loadProject(true);
    intervalId = setInterval(() => loadProject(false), 2500);

    return () => {
      controller.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedProjectId]);

  return (
    <>
      <AppShell
        sidebar={(
          <Sidebar
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            onProjectsChange={handleProjectsChange}
          />
        )}
        isSidebarOpen={isSidebarOpen}
        onSidebarClose={() => setIsSidebarOpen(false)}
        header={(
          <div>
            <div className="lg:hidden">
              <MobileHeader
                project={selectedProject}
                boardId={board?.id}
                isSidebarOpen={isSidebarOpen}
                isActivityOpen={isActivityOpen}
                onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                onToggleActivity={() => {
                  setIsActivityOpen((prev) => !prev);
                  setIsLogsOpen(false);
                  setIsDocsOpen(false);
                  setIsSidebarOpen(false);
                }}
              />
            </div>

            <div className="hidden lg:block px-6 pb-0 pt-6 lg:px-8 lg:pt-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocsOpen((prev) => !prev);
                      setIsLogsOpen(false);
                      setIsActivityOpen(false);
                      setIsSidebarOpen(false);
                    }}
                    disabled={!selectedProject}
                    className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-100 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogsOpen((prev) => !prev);
                      setIsDocsOpen(false);
                      setIsActivityOpen(false);
                      setIsSidebarOpen(false);
                    }}
                    disabled={!selectedProject}
                    className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-100 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Logs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsActivityOpen((prev) => !prev);
                      setIsLogsOpen(false);
                      setIsDocsOpen(false);
                      setIsSidebarOpen(false);
                    }}
                    disabled={!board}
                    className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-100 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Activity
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      >
        <section className="min-w-0 px-6 pb-6 lg:px-8 lg:pb-8">
          {projectsLoading ? <p className="text-gray-300">Loading projects...</p> : null}
          {!projectsLoading && error ? <p className="text-red-300">{error}</p> : null}

          {!projectsLoading && !error && projects.length === 0 ? (
            <p className="text-gray-300">No projects found.</p>
          ) : null}

          {!projectsLoading && !error && projects.length > 0 && projectLoading ? (
            <p className="text-gray-300">Loading project...</p>
          ) : null}

          {!projectsLoading && !error && selectedProject && board && !projectLoading ? (
            <>
              {pipelineWarning ? (
                <div className="mb-4 rounded-lg border border-red-700 bg-red-950/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-red-200">
                        Pipeline stopped / crashed
                      </p>
                      <p className="mt-1 text-xs text-red-200/80">
                        Step: {pipelineWarning.currentStep ?? 'unknown'} | Status: {pipelineWarning.status ?? 'unknown'}
                        {pipelineWarning.updatedAt ? ` | Updated: ${pipelineWarning.updatedAt}` : ''}
                        {pipelineWarning.staleLock ? ' | Stale lock detected' : ''}
                      </p>
                      {pipelineWarning.lastError ? (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-red-100">
                          {pipelineWarning.lastError}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogsOpen(true);
                          setIsDocsOpen(false);
                          setIsActivityOpen(false);
                          setIsSidebarOpen(false);
                        }}
                        className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
                      >
                        View logs
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <ProjectHeader project={selectedProject} onProjectUpdated={handleProjectUpdated} />
              <Board board={board} />
            </>
          ) : null}

          {!projectsLoading && !error && selectedProject && !board && !projectLoading ? (
            <>
              <ProjectHeader project={selectedProject} onProjectUpdated={handleProjectUpdated} />
              <p className="text-gray-300">No board found for this project.</p>
            </>
          ) : null}
        </section>
      </AppShell>

      <ActivityLog
        boardId={board?.id}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      {isDocsOpen && (
        <DocsPanel
          projectId={selectedProjectId}
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
        />
      )}

      {isLogsOpen && (
        <LogsPanel
          projectId={selectedProjectId}
          isOpen={isLogsOpen}
          onClose={() => setIsLogsOpen(false)}
        />
      )}
    </>
  );
}
