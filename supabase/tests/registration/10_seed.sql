-- Dos organizaciones A y B + usuarios. A abierta (UGC Colombia simulada), B cerrada.
INSERT INTO auth.users (id,email) VALUES
 ('00000000-0000-0000-0000-0000000000a1','admin_a@test.dev'),
 ('00000000-0000-0000-0000-0000000000a2','creator_a@test.dev'),
 ('00000000-0000-0000-0000-0000000000b1','admin_b@test.dev'),
 ('00000000-0000-0000-0000-0000000000c1','new_user@test.dev'),
 ('00000000-0000-0000-0000-0000000000d1','root@test.dev');
INSERT INTO public.profiles (id,email,full_name) SELECT id,email,split_part(email,'@',1) FROM auth.users;
INSERT INTO public.organizations (id,name,slug,is_registration_open,registration_require_invite) VALUES
 ('aaaaaaaa-0000-0000-0000-00000000000a','Org A','org-a',true,false),
 ('bbbbbbbb-0000-0000-0000-00000000000b','Org B','org-b',false,false);
INSERT INTO public.organization_members (organization_id,user_id,role) VALUES
 ('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a1','admin'),
 ('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a2','content_creator'),
 ('bbbbbbbb-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b1','admin');
INSERT INTO public.legal_documents (id,document_type,version,title,summary,content_html) VALUES
 ('d0000000-0000-0000-0000-000000000001','general_terms','v1.0','Terminos','s','<p>t</p>'),
 ('d0000000-0000-0000-0000-000000000002','talent_agreement','1.0','Acuerdo Talento','s','<p>t</p>'),
 ('d0000000-0000-0000-0000-000000000003','client_agreement','2.0','Acuerdo Cliente','s','<p>t</p>');
INSERT INTO public.legal_consent_requirements VALUES
 ('general_terms',NULL,'all',true,'registration',3),
 ('talent_agreement','talent','all',true,'registration',5),
 ('client_agreement','client','all',true,'registration',5);

-- En vivo, un trigger fija current_organization_id al crear la membresia.
UPDATE public.profiles SET current_organization_id='aaaaaaaa-0000-0000-0000-00000000000a' WHERE id IN ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2');
UPDATE public.profiles SET current_organization_id='bbbbbbbb-0000-0000-0000-00000000000b' WHERE id='00000000-0000-0000-0000-0000000000b1';
