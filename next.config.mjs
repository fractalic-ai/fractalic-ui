/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React strict mode for development
  async rewrites() {
    return [
      {
        source: '/list_directory',
        destination: 'http://127.0.0.1:8000/list_directory',
      },
      {
        source: '/branches_and_commits',
        destination: 'http://127.0.0.1:8000/branches_and_commits',
      },
      {
        source: '/get_file_content_disk',
        destination: 'http://127.0.0.1:8000/get_file_content_disk',
      },
      {
        source: '/create_file',
        destination: 'http://127.0.0.1:8000/create_file',
      },
      {
        source: '/create_folder',
        destination: 'http://127.0.0.1:8000/create_folder',
      },
      {
        source: '/get_file_content',
        destination: 'http://127.0.0.1:8000/get_file_content',
      },
      {
        source: '/save_file',
        destination: 'http://127.0.0.1:8000/save_file',
      },
      {
        source: '/delete_item',
        destination: 'http://127.0.0.1:8000/delete_item',
      },
      {
        source: '/rename_item',
        destination: 'http://127.0.0.1:8000/rename_item',
      },
      {
        source: '/load_settings',
        destination: 'http://127.0.0.1:8000/load_settings',
      },
      {
        source: '/save_settings',
        destination: 'http://127.0.0.1:8000/save_settings',
      },
    ];
  },
};

export default nextConfig;
