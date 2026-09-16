-- Pilot POSSARA-original Study questions. Not full curriculum coverage.
insert into public.study_questions (topic_id, stem, options, correct_option, explanation, difficulty, exam_targets)
select t.id, q.stem, q.options::jsonb, q.correct_option, q.explanation, q.difficulty, q.exam_targets
from public.study_topics t
join (values
('JSS3','Mathematics','linear-equations','Solve 3x + 5 = 20.','["x = 3","x = 5","x = 8","x = 15"]',1,'Subtract 5 from both sides to get 3x = 15, then divide by 3. Therefore x = 5.','standard','{BECE}'::text[]),
('JSS3','Mathematics','linear-equations','If 2y - 7 = 9, what is y?','["1","8","9","16"]',1,'Add 7 to both sides: 2y = 16. Divide by 2, so y = 8.','standard','{BECE}'::text[]),
('JSS3','Mathematics','linear-equations','Which value satisfies 5m + 2 = 2m + 17?','["3","5","6","15"]',1,'Subtract 2m from both sides: 3m + 2 = 17. Subtract 2: 3m = 15. Hence m = 5.','standard','{BECE}'::text[]),
('SS3','Mathematics','quadratic-equations','Solve x² - 5x + 6 = 0.','["x = 1 or 6","x = 2 or 3","x = -2 or -3","x = 5 or 6"]',1,'Factorise: x² - 5x + 6 = (x - 2)(x - 3). Therefore x = 2 or x = 3.','standard','{WAEC,NECO}'::text[]),
('SS3','Mathematics','quadratic-equations','What is the standard form of a quadratic equation?','["ax + bx + c = 0","ax² + bx + c = 0","a + bx² + c = 0","ax³ + bx + c = 0"]',1,'A quadratic has highest power 2, so its standard form is ax² + bx + c = 0 with a not equal to zero.','foundation','{WAEC,NECO}'::text[]),
('SS3','Mathematics','quadratic-equations','The roots of x² - 9 = 0 are:','["3 only","-3 only","3 and -3","9 and 1"]',2,'x² - 9 is a difference of two squares: (x - 3)(x + 3) = 0. Hence x = 3 or x = -3.','standard','{WAEC,NECO}'::text[]),
('SS3','English Language','subject-verb-concord','Choose the correct sentence.','["Each of the players are ready.","Each of the players is ready.","Each of the player are ready.","Each players is ready."]',1,'The grammatical subject is “Each”, which is singular, so the singular verb “is” is required.','standard','{WAEC,NECO,JAMB}'::text[]),
('SS3','English Language','subject-verb-concord','The list of items ___ on the table.','["are","were","is","have"]',2,'The subject is “list”, not “items”. “List” is singular, so “is” agrees with it.','standard','{WAEC,NECO,JAMB}'::text[]),
('SS3','English Language','subject-verb-concord','Neither the teacher nor the students ___ absent.','["was","is","were","has"]',2,'With neither...nor, the verb commonly agrees with the nearer subject. The nearer subject “students” is plural, so “were” fits.','standard','{WAEC,NECO,JAMB}'::text[])
) as q(class_level,subject,slug,stem,options,correct_option,explanation,difficulty,exam_targets)
  on t.class_level=q.class_level and t.subject=q.subject and t.slug=q.slug
on conflict (topic_id, stem) do nothing;
