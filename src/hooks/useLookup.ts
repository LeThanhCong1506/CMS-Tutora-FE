import { useEffect, useState } from 'react';
import {
  getSubjects,
  getGradeLevels,
  getQuestionTypes,
  type Subject,
  type GradeLevel,
  type QuestionType,
} from '../services/lookup.service';

/** Gọi API môn/lớp/loại câu hỏi, đổ vào state cho dropdown. Đơn giản. */
export function useLookup() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [types, setTypes] = useState<QuestionType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSubjects(), getGradeLevels(), getQuestionTypes()])
      .then(([s, g, t]) => {
        setSubjects(s);
        setGrades(g);
        setTypes(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { subjects, grades, types, loading };
}
