import { supabase } from "@/utils/supabase";

export type LibraryResourceType =
  | "Document"
  | "Note"
  | "Link"
  | "File";

export type LibraryResource = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: LibraryResourceType;
  category: string;
  url: string | null;
  content: string | null;
  file_path: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateLibraryResourceInput = {
  title: string;
  description?: string;
  type: LibraryResourceType;
  category?: string;
  url?: string | null;
  content?: string | null;
  file_path?: string | null;
  favorite?: boolean;
};

export type UpdateLibraryResourceInput = Partial<
  Omit<
    CreateLibraryResourceInput,
    "title"
  >
> & {
  title?: string;
};

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error(
      "You must be signed in to use the Library."
    );
  }

  return user.id;
}

export async function fetchLibraryResources(): Promise<
  LibraryResource[]
> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("library_resources")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LibraryResource[];
}

export async function createLibraryResource(
  input: CreateLibraryResourceInput
): Promise<LibraryResource> {
  const userId = await getCurrentUserId();

  const title = input.title.trim();

  if (!title) {
    throw new Error(
      "Please enter a title for the resource."
    );
  }

  const { data, error } = await supabase
    .from("library_resources")
    .insert({
      user_id: userId,
      title,
      description:
        input.description?.trim() ?? "",
      type: input.type,
      category:
        input.category?.trim() || "Personal",
      url: input.url?.trim() || null,
      content:
        input.content?.trim() || null,
      file_path:
        input.file_path?.trim() || null,
      favorite: input.favorite ?? false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as LibraryResource;
}

export async function updateLibraryResource(
  id: string,
  updates: UpdateLibraryResourceInput
): Promise<LibraryResource> {
  const userId = await getCurrentUserId();

  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    const title = updates.title.trim();

    if (!title) {
      throw new Error(
        "Resource title cannot be empty."
      );
    }

    payload.title = title;
  }

  if (updates.description !== undefined) {
    payload.description =
      updates.description.trim();
  }

  if (updates.type !== undefined) {
    payload.type = updates.type;
  }

  if (updates.category !== undefined) {
    payload.category =
      updates.category.trim() || "Personal";
  }

  if (updates.url !== undefined) {
    payload.url =
      updates.url?.trim() || null;
  }

  if (updates.content !== undefined) {
    payload.content =
      updates.content?.trim() || null;
  }

  if (updates.file_path !== undefined) {
    payload.file_path =
      updates.file_path?.trim() || null;
  }

  if (updates.favorite !== undefined) {
    payload.favorite = updates.favorite;
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("library_resources")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as LibraryResource;
}

export async function toggleLibraryFavorite(
  id: string,
  favorite: boolean
): Promise<LibraryResource> {
  return updateLibraryResource(id, {
    favorite,
  });
}

export async function deleteLibraryResource(
  id: string
): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("library_resources")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}