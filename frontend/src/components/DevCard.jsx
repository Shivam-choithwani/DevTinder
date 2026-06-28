import React, { useState, useEffect } from 'react';
import { FileText, Briefcase, Calendar, Globe } from 'lucide-react';
import { projectService } from '../services/api';

const Github = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function DevCard({ profile, swipeDirection }) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (profile?.userId) {
      const fetchProjects = async () => {
        try {
          const userProjects = await projectService.getProjectsByOwner(profile.userId);
          setProjects(userProjects || []);
        } catch (err) {
          console.error('Failed to fetch projects for dev card', err);
        }
      };
      fetchProjects();
    }
  }, [profile?.userId]);

  if (!profile) return null;

  const {
    fullName,
    age,
    bio,
    githubUrl,
    resumeUrl,
    skills = [],
    interests = [],
    yearsOfExperience,
    photoUrl
  } = profile;

  return (
    <div className="relative w-full max-w-sm sm:max-w-md h-[560px] sm:h-[600px] rounded-3xl overflow-hidden glass-panel border border-slate-800 shadow-2xl transition-all duration-300 select-none flex flex-col justify-end">
      {/* Background Image */}
      <img
        src={photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=600&h=600'}
        alt={fullName}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Dark vignette gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none"></div>

      {/* Swipe Badges Overlay (Tinder-style LIKE/PASS indicators) */}
      {swipeDirection === 'right' && (
        <div className="absolute top-10 left-10 transform -rotate-12 border-4 border-emerald-500 text-emerald-500 font-extrabold text-3xl px-4 py-1.5 rounded-xl uppercase tracking-widest bg-emerald-950/80 pointer-events-none z-20 animate-pulse">
          INTERESTED
        </div>
      )}
      {swipeDirection === 'left' && (
        <div className="absolute top-10 right-10 transform rotate-12 border-4 border-rose-500 text-rose-500 font-extrabold text-3xl px-4 py-1.5 rounded-xl uppercase tracking-widest bg-rose-950/80 pointer-events-none z-20 animate-pulse">
          IGNORE
        </div>
      )}

      {/* Card Details Overlay */}
      <div className="relative z-10 p-6 flex flex-col gap-4 max-h-[70%] overflow-y-auto">
        {/* Name, Age, YOE */}
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {fullName}
            </h2>
            {age && (
              <span className="text-xl sm:text-2xl text-slate-300 font-medium">
                {age}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs sm:text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-violet-400" />
              {yearsOfExperience} {yearsOfExperience === 1 ? 'Year' : 'Years'} Exp
            </span>
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-violet-400 hover:text-violet-300 hover:underline"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
              </a>
            )}
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
              >
                <FileText className="w-3.5 h-3.5" />
                Resume
              </a>
            )}
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">
            {bio}
          </p>
        )}

        {/* Featured Projects */}
        {projects.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-900/60 pt-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Featured Projects</span>
            <div className="flex flex-col gap-2">
              {projects.slice(0, 2).map((proj) => (
                <div
                  key={proj.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-900/60 hover:border-slate-800 transition-all flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">{proj.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {proj.githubUrl && (
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-violet-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Github className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {proj.liveDemoUrl && (
                        <a
                          href={proj.liveDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  {proj.description && (
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                  {proj.technologiesUsed && proj.technologiesUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {proj.technologiesUsed.slice(0, 3).map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-slate-900 text-violet-300 border border-violet-500/10 text-[9px] font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                      {proj.technologiesUsed.length > 3 && (
                        <span className="text-[9px] text-slate-500 self-center">
                          +{proj.technologiesUsed.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Tag Array */}
        {skills.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Skills</span>
            <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-900/60 text-violet-300 border border-violet-500/20"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests Tag Array */}
        {interests.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interests</span>
            <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto pr-1">
              {interests.map((interest, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-950/80 text-blue-300 border border-blue-500/10"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
