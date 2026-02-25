import { useCallback, useEffect, useState } from 'react';
import Board from './components/Board.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import ProjectHeader from './components/ProjectHeader.jsx';
import Sidebar from './components/Sidebar.jsx';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [board, setBoard] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const [error, setError] = useState('');
  const [isActivityOpen, setIsActivityOpen] = useState(false);

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
    <main className="min-h-screen bg-gray-900 text-gray-100">
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onProjectsChange={handleProjectsChange}
      />

      <section className="ml-[260px] p-6">
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsActivityOpen((prev) => !prev)}
            disabled={!board}
            className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
            <ProjectHeader project={selectedProject} />
            <Board board={board} />
          </>
        ) : null}

        {!projectsLoading && !error && selectedProject && !board && !projectLoading ? (
          <>
            <ProjectHeader project={selectedProject} />
            <p className="text-gray-300">No board found for this project.</p>
          </>
        ) : null}
      </section>

      <ActivityLog
        boardId={board?.id}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </main>
  );
}
