import { useCallback, useEffect, useState } from 'react';
import Board from './components/Board.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import ProjectHeader from './components/ProjectHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import LogsPanel from './components/LogsPanel.jsx';

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
      return;
    }

    const controller = new AbortController();

    async function loadProject() {
      try {
        setProjectLoading(true);
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
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unexpected error');
        }
      } finally {
        setProjectLoading(false);
      }
    }

    loadProject();

    return () => controller.abort();
  }, [selectedProjectId]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onProjectsChange={handleProjectsChange}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <section className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-end">
            <button
              type="button"
              onClick={() => { setIsLogsOpen((prev) => !prev); setIsActivityOpen(false); }}
              disabled={!selectedProject}
              className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-100 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Logs
            </button>
            <button
              type="button"
              onClick={() => { setIsActivityOpen((prev) => !prev); setIsLogsOpen(false); }}
              disabled={!board}
              className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-100 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Activity
            </button>
          </div>

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
      </main>

      <ActivityLog
        boardId={board?.id}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      <LogsPanel
        projectId={selectedProjectId}
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />
    </div>
  );
}
