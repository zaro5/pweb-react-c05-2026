import { useEffect, useState } from "react";

const INITIAL_SECONDS = 120; // 02:00

const IT_QUESTIONS: string[] = [
  "Jelaskan perbedaan let, const, dan var di JavaScript.",
  "Apa itu REST API dan apa bedanya dengan GraphQL?",
  "Jelaskan cara kerja useEffect dan kapan cleanup function dijalankan.",
  "Apa perbedaan SQL dan NoSQL? Kapan memilih salah satunya?",
  "Jelaskan konsep Big-O notation dengan contoh sederhana.",
  "Apa itu Git branching dan kenapa penting dalam kerja tim?",
  "Jelaskan perbedaan TCP dan UDP.",
];

export function InterviewPrepTimer() {
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
  const [running, setRunning] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  // Interval berjalan hanya saat running = true, cleanup wajib.
  useEffect(() => {
    if (!running) return;

    const intervalId = setInterval(() => {
      setSecondsLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [running]);

  // Berhenti otomatis saat waktu habis.
  useEffect(() => {
    if (secondsLeft === 0) {
      setRunning(false);
    }
  }, [secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const isFinished = secondsLeft === 0;
  const isStarted = secondsLeft < INITIAL_SECONDS;

  function handleStartPause() {
    if (isFinished) return;
    setRunning((previous) => !previous);
  }

  function handleReset() {
    setRunning(false);
    setSecondsLeft(INITIAL_SECONDS);
  }

  function handleNextQuestion() {
    setQuestionIndex((previous) => (previous + 1) % IT_QUESTIONS.length);
    setRunning(false);
    setSecondsLeft(INITIAL_SECONDS);
  }

  return (
    <section className="prep-timer">
      <h2>Interview Prep Timer</h2>

      <p className="prep-counter">
        Pertanyaan {questionIndex + 1} dari {IT_QUESTIONS.length}
      </p>

      <blockquote className="prep-question">
        {IT_QUESTIONS[questionIndex]}
      </blockquote>

      <div
        className={`timer-display ${isFinished ? "timer-finished" : ""}`}
        aria-live="polite"
      >
        {mm}:{ss}
      </div>

      {isFinished && (
        <p className="prep-finished">Waktu habis! Lanjut ke pertanyaan berikutnya.</p>
      )}

      <div className="prep-actions">
        <button onClick={handleStartPause} disabled={isFinished}>
          {running ? "Pause" : isStarted ? "Lanjut" : "Mulai"}
        </button>

        <button onClick={handleReset}>Reset</button>

        <button onClick={handleNextQuestion}>Pertanyaan Berikutnya</button>
      </div>
    </section>
  );
}