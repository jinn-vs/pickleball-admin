import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Database helper functions
export const db = {
  // Posts
  posts: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:authors(id, name, email),
          categories:post_categories(category:categories(id, name)),
          tags:post_tags(tag:tags(id, name))
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:authors(id, name, email),
          categories:post_categories(category:categories(id, name)),
          tags:post_tags(tag:tags(id, name))
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },

    create: async (postData) => {
      const { data, error } = await supabase
        .from("posts")
        .insert([postData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, postData) => {
      const { data, error } = await supabase
        .from("posts")
        .update(postData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);

      if (error) throw error;
    },
  },

  // Article
  article: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("article")
        .select(
          `
          *,
          author:authors(id, name, email),
          categories:article_categories(category:categories_article(id, name)),
          tags:article_tags(tag:tags_article(id, name))
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from("article")
        .select(
          `
          *,
          author:authors(id, name, email),
          categories:article_categories(category:categories_article(id, name)),
          tags:article_tags(tag:tags_article(id, name))
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },

    create: async (postData) => {
      const { data, error } = await supabase
        .from("article")
        .insert([postData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, postData) => {
      const { data, error } = await supabase
        .from("article")
        .update(postData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase.from("article").delete().eq("id", id);

      if (error) throw error;
    },
  },

  // Authors
  authors: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    create: async (authorData) => {
      const { data, error } = await supabase
        .from("authors")
        .insert([authorData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, authorData) => {
      const { data, error } = await supabase
        .from("authors")
        .update(authorData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase.from("authors").delete().eq("id", id);

      if (error) throw error;
    },
  },

  // Categories
  categories: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },

    create: async (categoryData) => {
      const { data, error } = await supabase
        .from("categories")
        .insert([categoryData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, categoryData) => {
      const { data, error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;
    },
  },

  // Article Categories
  categories_article: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("categories_article")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },

    create: async (categoryData) => {
      const { data, error } = await supabase
        .from("categories_article")
        .insert([categoryData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, categoryData) => {
      const { data, error } = await supabase
        .from("categories_article")
        .update(categoryData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from("categories_article")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
  },

  // Tags
  tags: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },

    create: async (tagData) => {
      const { data, error } = await supabase
        .from("tags")
        .insert([tagData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, tagData) => {
      const { data, error } = await supabase
        .from("tags")
        .update(tagData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);

      if (error) throw error;
    },
  },

  // Tags
  tags_article: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("tags_article")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },

    create: async (tagData) => {
      const { data, error } = await supabase
        .from("tags_article")
        .insert([tagData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, tagData) => {
      const { data, error } = await supabase
        .from("tags_article")
        .update(tagData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from("tags_article")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
  },

  // Web3 Projects
  web3Projects: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("web3_projects")
        .select(
          `
          *,
          author:authors(id, name, email),
          vertical:web3_verticals(id, title, full_name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    create: async (projectData) => {
      const { data, error } = await supabase
        .from("web3_projects")
        .insert([projectData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, projectData) => {
      const { data, error } = await supabase
        .from("web3_projects")
        .update(projectData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from("web3_projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
  },

  // Web3 Verticals
  web3Verticals: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("web3_verticals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    create: async (verticalData) => {
      const { data, error } = await supabase
        .from("web3_verticals")
        .insert([verticalData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, verticalData) => {
      const { data, error } = await supabase
        .from("web3_verticals")
        .update(verticalData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from("web3_verticals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
  },

  // Admins
  admins: {
    getAll: async () => {
      const { data, error } = await supabase
        .from("admins")
        .select(
          "id, name, email, role, avatar_url, last_login, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    create: async (adminData) => {
      const { data, error } = await supabase
        .from("admins")
        .insert([adminData])
        .select(
          "id, name, email, role, avatar_url, last_login, created_at, updated_at"
        )
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id, adminData) => {
      const { data, error } = await supabase
        .from("admins")
        .update(adminData)
        .eq("id", id)
        .select(
          "id, name, email, role, avatar_url, last_login, created_at, updated_at"
        )
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase.from("admins").delete().eq("id", id);

      if (error) throw error;
    },
  },
};

// Real-time subscriptions
export const subscribeToTable = (table, callback) => {
  return supabase
    .channel(`public:${table}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, callback)
    .subscribe();
};

// File upload helpers
export const uploadFile = async (bucket, filePath, file) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) throw error;
  return data;
};

export const getFileUrl = (bucket, filePath) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return data.publicUrl;
};
